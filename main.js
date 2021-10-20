import {
    OrthographicCamera,
    Scene,
    Color,
    AmbientLight,
    DirectionalLight,
    WebGLRenderer
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

let camera, scene, renderer, effect, mesh, helper
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
    const scale = 30
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
        keys.forEach((key, index)=> {
            mesh.morphTargetInfluences[index] = controls[key]
        })
    }

    const onChangePose = () => {
        const index = parseInt(controls.pose)
        if(index === -1) {
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

const init = () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const scale = 30
    // camera
    camera = new OrthographicCamera(
        window.innerWidth / scale / - 2,
        window.innerWidth / scale / 2,
        window.innerHeight / scale / 2,
        window.innerHeight / scale / - 2,
        0.1,
        1000
    )
    camera.position.z = 25

    // scene
    scene = new Scene()
    scene.background = new Color(0xffffff)
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
}

window.addEventListener('resize', onWindowResize)