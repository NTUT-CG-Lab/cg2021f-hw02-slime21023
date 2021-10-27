import {
    OrthographicCamera,
    Scene,
    Color,
    AmbientLight,
    DirectionalLight,
    WebGLRenderer,
    BufferGeometry,
    LineBasicMaterial,
    Vector3,
    Line,
    Raycaster,
    Vector2,
    PlaneGeometry,
    ShadowMaterial,
    Mesh,
    Object3D
} from './assets/js/three.module.js'
import { GUI } from './assets/js/dat.gui.module.js'
import { OrbitControls } from './assets/js/OrbitControls.js'
import { OutlineEffect } from './assets/js/OutlineEffect.js'
import { MMDLoader } from './assets/js/MMDLoader.js'
import { MMDAnimationHelper } from './assets/js/MMDAnimationHelper.js'

Ammo().then(AmmoLib => {
    Ammo = AmmoLib
    init()
    animate()
})

let renderer, effect
// scene
const scene = new Scene()
scene.background = new Color(0xffffff)
const scale = 30
// camera
const camera = new OrthographicCamera(
    window.innerWidth / scale / - 2,
    window.innerWidth / scale / 2,
    window.innerHeight / scale / 2,
    window.innerHeight / scale / - 2,
    0.1,
    1000
)
camera.position.z = 25
camera.lookAt(0, 0, 0)

const modelList = [
    'assets/models/mmd/kizunaai/kizunaai.pmx',
    'assets/models/mmd/るいのれ式物述有栖_配布用フォルダ/物述有栖.pmx',
    'assets/models/mmd/『天宮こころ(Kokoro Amamiya)』/『天宮こころ(Kokoro Amamiya)』.pmx'
]

const vpdFiles = [
    'assets/models/mmd/vpds/01.vpd',
    'assets/models/mmd/vpds/02.vpd',
    'assets/models/mmd/vpds/03.vpd',
    'assets/models/mmd/vpds/04.vpd',
    'assets/models/mmd/vpds/05.vpd',
    'assets/models/mmd/vpds/06.vpd',
    'assets/models/mmd/vpds/07.vpd',
    'assets/models/mmd/vpds/08.vpd',
    'assets/models/mmd/vpds/11.vpd'
]

const onWindowResize = () => {
    camera.left = window.innerWidth / scale / - 2
    camera.right = window.innerWidth / scale / 2
    camera.top = window.innerHeight / scale / 2
    camera.bottom = window.innerHeight / scale / - 2
    camera.updateProjectionMatrix()

    effect.setSize(window.innerWidth, window.innerHeight)
}

const animate = () => {
    requestAnimationFrame(animate)
    effect.render(scene, camera)
}

class DrawLineSystem extends Object3D {
    constructor() {
        super()
        const planeGeo = new PlaneGeometry(25, 25)
        const planeMat = new ShadowMaterial()
        planeMat.opacity = 0.25
        this._plane = new Mesh(planeGeo, planeMat)
        this._plane.position.z = camera.position.z - 1.2
        this._modeColor = [0xff0000, 0x04ff00, 0xff0000, 0x04ff00]
        this._copyColor = [0xe100ff, 0x00f2ff, 0xe100ff, 0x00f2ff]
        this._curMode = 1
        this.isCopied = false
        this.originLineArray = new Array(4)
        scene.add(this)
    }

    changeMode(key) {
        this._curMode = parseInt(key)
    }

    addLine(x, y) {
        const geometry = new BufferGeometry()
        const material = new LineBasicMaterial({ color: this._modeColor[this._curMode - 1] })
        let points
        if ((this._curMode) % 2 == 1) {
            points = [
                new Vector3(0, y, camera.position.z - 1),
                new Vector3(2, y, camera.position.z - 1)
            ]
            geometry.setFromPoints(points)
        } else {
            points = [
                new Vector3(x, y + 1, camera.position.z - 1),
                new Vector3(x, y - 1, camera.position.z - 1)
            ]
            geometry.setFromPoints(points)
        }

        const line = new Line(geometry, material)
        line.userData.points = points
        line.userData.mode = this._curMode
        line.userData.isOriginal = true
        line.name = 'line'
        this.originLineArray[this._curMode -1] = line
        this.add(line)
    }

    removeLine(item) {
        const { uuid } = item.object
        this.remove(item.object)
    }

    copyLines() {
        const originLine = this.children.filter(item => item.userData.isOriginal == true)
        console.log(originLine)
        const newLines = originLine.map(item => {
            const { mode, points } = item.userData
            const geometry = new BufferGeometry()
            const material = new LineBasicMaterial({ color: this._copyColor[mode - 1] })

            geometry.setFromPoints(points.map(point => {
                let newPoint = point.clone()
                newPoint.setX(point.x == 0 ? 0 : - point.x)
                return newPoint
            }))

            const line = new Line(geometry, material)
            line.userData.points = points
            line.userData.mode = mode
            line.userData.isOriginal = false
            line.name = 'line'
            return line
        })
        newLines.forEach(item => this.add(item))
    }

    getLinesData() {
        let data = {}
        const [l1, l2, l3, l4] = this.originLineArray 
        if (l1) {
            data.line_locationy_3 =  l1.userData.points[0].y
            data.line_locationy_4 =  l1.userData.points[0].y
        }

        if (l2) {
            data.line_locationx_1 =  l2.userData.points[0].x
            data.line_locationx_3 =  l2.userData.points[0].x
        }

        if (l3) {
            data.line_locationy_1 =  l3.userData.points[0].y
            data.line_locationy_2 =  l3.userData.points[0].y
        }

        if (l4) {
            data.line_locationx_2 =  l4.userData.points[0].x
            data.line_locationx_4 =  l4.userData.points[0].x
        }
        return data
    }

    reset() {
        this.clear()
        this._curMode = 1
        this.isCopied = false
        this.originLineArray = new Array(4)
    }
}

class MMDManager {
    constructor(modelist) {
        this.folders = []
        this.gui = new GUI()
        this.curIndex = 0
        Promise.all(modelist.map(MMDManager.loadModel)).then(models => {
            this.models = models
            const curModel = this.models[this.curIndex]
            scene.add(curModel.mesh)
            this.refreshGUI(curModel)
        })
    }

    static loadModel(url) {
        return new Promise(resolve => {
            let loader = new MMDLoader()
            let helper = new MMDAnimationHelper()

            let model = { helper }
            const onProgress = xhr => {
                if (xhr.lengthComputable) {
                    const percentComplete = xhr.loaded / xhr.total * 100
                    console.log(`${Math.round(percentComplete, 2)}% downloaded`)
                }
            }

            const loadVpd = vpdFile => new Promise(resolve => {
                loader.loadVPD(vpdFile, false, vpd => resolve(vpd), onProgress, null)
            })

            loader.load(url, mesh => {
                model.mesh = mesh
                mesh.position.y = -10

                const loadFiles = vpdFiles.map(loadVpd)
                Promise.all(loadFiles).then(vpds => {
                    model.vpds = vpds
                    resolve(model)
                })
            }, onProgress, null)
        })
    }

    refreshGUI({ mesh, helper, vpds }) {
        this.folders.forEach( item => this.gui.removeFolder(item))
        const poses = this.gui.addFolder('Poses')
        const morphs = this.gui.addFolder('Morphs')
        this.folders = [poses, morphs]
        const getBaseName = s => s.slice(s.lastIndexOf('/') + 1)

        const dictionary = mesh.morphTargetDictionary
        const controls = {}
        const keys = []

        const onChangePose = () => {
            const index = parseInt(controls.pose)
            if (index === -1) {
                mesh.pose()
                return
            }
            helper.pose(mesh, vpds[index])
        }

        const onChangeMorph = () => {
            keys.forEach((key, index) => {
                mesh.morphTargetInfluences[index] = controls[key]
            })
        }

        Object.keys(dictionary).forEach(key => { controls[key] = 0.0 })
        controls.pose = -1
        vpdFiles.forEach(item => {
            controls[getBaseName(item)] = false
        })

        keys.push(...Object.keys(dictionary))
        const files = { default: -1 }
        vpdFiles.forEach((item, index) => { files[getBaseName(item)] = index })
        poses.add(controls, 'pose', files).onChange(onChangePose)
        Object.keys(dictionary).forEach(key => {
            morphs.add(controls, key, 0.0, 1.0, 0.01).onChange(onChangeMorph)
        })

        onChangeMorph()
        onChangePose()

        poses.open()
        morphs.open()
    }

    next() {
        const index = this.curIndex
        if (index == this.models.length - 1) {
            alert('It is the last one.')
            return
        }
        scene.remove(this.models[index].mesh)
        this.curIndex = index + 1
        const curModel = this.models[this.curIndex]
        scene.add(curModel.mesh)
        this.refreshGUI(curModel)
    }

    last() {
        const index = this.curIndex
        if (index == 0) {
            alert('It is the first one.')
            return
        }
        scene.remove(this.models[index].mesh)
        this.curIndex = index - 1
        const curModel = this.models[this.curIndex]
        scene.add(curModel.mesh)
        this.refreshGUI(curModel)
    }
}

const manager = new MMDManager(modelList)
const lineSystem = new DrawLineSystem()

const init = () => {
    const container = document.createElement('div')
    container.classList.add("three")
    document.body.appendChild(container)

    const ambient = new AmbientLight(0x666666)
    scene.add(ambient)
    const directionalLight = new DirectionalLight(0x887766)
    directionalLight.position.set(-1, 1, 1).normalize()
    scene.add(directionalLight)

    // renderer
    renderer = new WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    container.appendChild(renderer.domElement)

    effect = new OutlineEffect(renderer)

    const cameraControls = new OrbitControls(camera, renderer.domElement)
    cameraControls.minDistance = 10
    cameraControls.maxDistance = 100
    cameraControls.enableRotate = false
    const raycaster = new Raycaster()
    raycaster.params.Line.threshold = 0.1

    // add mouse event
    let lastPosition = new Vector2()
    renderer.domElement.addEventListener('mousedown', ({ currentTarget, clientX, clientY, which }) => {
        if (which != 1) return

        const { left, top, width, height } = currentTarget.getBoundingClientRect()

        const mouse = new Vector2(
            ((clientX - left + 1) / width) * 2 - 1,
            - ((clientY - top + 1) / height) * 2 + 1
        )

        lastPosition.copy(mouse)
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(scene.children)
        const firstItem = intersects.length > 0 ? intersects[0] : null
        if (!firstItem) return
        if (firstItem && firstItem.object.name === 'line') {
            lineSystem.removeLine(firstItem)
            return
        }

        const { x, y } = firstItem.point
        lineSystem.addLine(x, y)
    })
}

window.addEventListener('resize', onWindowResize)

let modelData = new Array(modelList.length)
const saveFile = async (data) => {
    const options = {
        suggestedName: 'model_data.json',
        types: [
            {
                description: 'Model Data List Files',
                accept: { 'application/json': ['.json'] }
            }
        ]
    }
    const handle = await window.showSaveFilePicker(options)
    const writable = await handle.createWritable()
    await writable.write(JSON.stringify(data))
    await writable.close()
}

document.addEventListener('keydown', async ({ key }) => {
    if (key == '1' || key == '2' || key == '3' || key == '4') {
        lineSystem.changeMode(key)
    }

    if (key == 'q' || key == 'Q') {
        lineSystem.copyLines()
    }

    if (key == 'a' || key == 'A') {
        const index = manager.curIndex
        const data = lineSystem.getLinesData()
        modelData[index] = { location: modelList[index], ...data }
        lineSystem.reset()
        manager.last()
    }

    if (key == 'd' || key == 'D') {
        const index = manager.curIndex
        const data = lineSystem.getLinesData()
        modelData[index] = { location: modelList[index], ...data }
        lineSystem.reset()
        manager.next()
    }

    if (key == 's' || key == 'S') {
        const index = manager.curIndex
        const data = lineSystem.getLinesData()
        modelData[index] = { location: modelList[index], ...data }
        await saveFile({ modellist: modelData })
    }
}, false);