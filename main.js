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
    LineSegments,
    Raycaster,
    Vector2,
    PlaneGeometry,
    ShadowMaterial,
    Mesh,
    MathUtils
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

let renderer, effect, mesh, helper
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

const vpds = []
const modelFile = 'assets/models/mmd/kizunaai/kizunaai.pmx'
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

const initGui = () => {
    const gui = new GUI()
    const dictionary = mesh.morphTargetDictionary
    const controls = {}
    const keys = []

    const poses = gui.addFolder('Poses')
    const morphs = gui.addFolder('Morphs')
    const getBaseName = s => s.slice(s.lastIndexOf('/') + 1)
    const initControls = () => {
        Object.keys(dictionary).forEach(key => {
            controls[key] = 0.0
        })

        controls.pose = -1
        vpdFiles.forEach(item => {
            controls[getBaseName(item)] = false
        })
    }

    const initKeys = () => {
        keys.push(...Object.keys(dictionary))
    }

    const initPoses = () => {
        const files = { default: -1 }
        vpdFiles.forEach((item, index) => {
            files[getBaseName(item)] = index
        })
        poses.add(controls, 'pose', files).onChange(onChangePose)
    }

    const initMorphs = () => {
        Object.keys(dictionary).forEach(key => {
            morphs.add(controls, key, 0.0, 1.0, 0.01).onChange(onChangeMorph)
        })
    }

    const onChangeMorph = () => {
        keys.forEach((key, index) => {
            mesh.morphTargetInfluences[index] = controls[key]
        })
    }

    const onChangePose = () => {
        const index = parseInt(controls.pose)
        if (index === -1) {
            mesh.pose()
            return
        }
        helper.pose(mesh, vpds[index])
    }

    initControls()
    initKeys()
    initPoses()
    initMorphs()

    onChangeMorph()
    onChangePose()

    poses.open()
    morphs.open()
}

class DrawLineSystem {
    constructor() {
        const planeGeo = new PlaneGeometry(25, 25)
        const planeMat = new ShadowMaterial()
        planeMat.opacity = 0.25
        this._plane = new Mesh(planeGeo, planeMat)
        this._plane.position.z = camera.position.z - 1.2
        scene.add(this._plane)
        this._lines = []
        // this._points = []
    }

    addLine(x, y) {
        const geometry = new BufferGeometry()
        const material = new LineBasicMaterial({ color: 0x0000ff })
        if ((this._lines.length + 1) % 2 == 1) {
            geometry.setFromPoints([
                new Vector3(0, y, camera.position.z - 1),
                new Vector3(2, y, camera.position.z - 1)
            ])
        } else {
            geometry.setFromPoints([
                new Vector3(x, y + 1, camera.position.z - 1),
                new Vector3(x, y - 1, camera.position.z - 1)
            ])
        }

        const line = new LineSegments(geometry, material)
        line.userData.isDraggable = true
        line.userData.isHorizontal = (this._lines.length + 1) % 2 == 1 ? true : false
        line.name = 'line'
        scene.add(line)
        this._lines.push(line)
    }

    removeLine(item) {
        const { uuid } = item.object
        this._lines = this._lines.filter(item => item.uuid != uuid)
        scene.remove(item.object)
    }

    copyLines() {
        const radian = MathUtils.degToRad(180)
        this._lines[0].rotateY(radian)
        // const newLines = this._lines.map(item => item.clone())
        // newLines.forEach(item => item.rotateY(radian))
        // this._lines.push(...newLines)
    }

    getLines() {
        return this._lines
    }
}
const lineSystem = new DrawLineSystem()

const init = () => {
    const container = document.createElement('div')
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

    const onProgress = xhr => {
        if (xhr.lengthComputable) {
            const percentComplete = xhr.loaded / xhr.total * 100
            console.log(`${Math.round(percentComplete, 2)}% downloaded`)
        }
    }

    helper = new MMDAnimationHelper()
    const loader = new MMDLoader()


    loader.load(modelFile, object => {
        mesh = object
        mesh.position.y = -10
        scene.add(mesh)

        let vpdIndex = 0
        const loadVpd = () => {
            const vpdFile = vpdFiles[vpdIndex]
            loader.loadVPD(vpdFile, false, vpd => {
                vpds.push(vpd)
                vpdIndex++

                if (vpdIndex < vpdFiles.length) {
                    loadVpd()
                } else {
                    initGui()
                }
            }, onProgress, null)
        }

        loadVpd()
    }, onProgress, null)

    const cameraControls = new OrbitControls(camera, renderer.domElement)
    cameraControls.minDistance = 10
    cameraControls.maxDistance = 100
    cameraControls.enableRotate = false
    const raycaster = new Raycaster()
    raycaster.params.Line.threshold = 0.1

    // add mouse event
    let lastPosition = new Vector2()
    renderer.domElement.addEventListener('mousedown', ({ clientX, clientY, which }) => {
        if (which != 1) return
        const mouse = new Vector2(
            (clientX / window.innerWidth) * 2 - 1,
            - (clientY / window.innerHeight) * 2 + 1
        )
        lastPosition.copy(mouse)
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(scene.children)
        const firstItem = intersects.length > 0 ? intersects[0] : null
        // console.log(firstItem)
        if (!firstItem) return
        if (firstItem && firstItem.object.name === 'line') {
            lineSystem.removeLine(firstItem)
            return
        }

        const { x, y } = firstItem.point
        lineSystem.addLine(x, y)
    })

    renderer.domElement.addEventListener('mousemove', ({ clientX, clientY, buttons }) => {
        if (buttons != 1) return
        const mouse = new Vector2(
            (clientX / window.innerWidth) * 2 - 1,
            - (clientY / window.innerHeight) * 2 + 1
        )
        raycaster.setFromCamera(mouse, camera)
        const offset = mouse.clone().sub(lastPosition)
        lastPosition.copy(mouse)

        const intersects = raycaster.intersectObjects(scene.children)
        const item = intersects.length > 0 ? intersects[0] : null
        if (!item) return
        if (item && item.object.name === 'line') {
            if (item.object.userData.isDraggable == false) return
            if (item.object.userData.isHorizontal == true) {
                item.object.position.y += offset.y * 0.2
            } else {
                item.object.position.x += offset.x * 0.2
            }
        }
    })

    renderer.domElement.addEventListener('mouseup', ({ clientX, clientY }) => {
        const mouse = new Vector2(
            (clientX / window.innerWidth) * 2 - 1,
            - (clientY / window.innerHeight) * 2 + 1
        )
        raycaster.setFromCamera(mouse, camera)
        const intersects = raycaster.intersectObjects(scene.children)
        const item = intersects.length > 0 ? intersects[0] : null
        if (!item) return
        if (item && item.object.name === 'line') {
            item.object.userData.isDraggable = false
        }
    })

}

window.addEventListener('resize', onWindowResize)

let isCopied = false
document.addEventListener('keydown', ({ key }) => {
    if (key == 'q' || key == 'Q') {
        lineSystem.copyLines()
        isCopied = true
        console.log(lineSystem.getLines())
    }



}, false);