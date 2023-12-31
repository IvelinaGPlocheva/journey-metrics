import "/tailwind.css";
import * as THREE from 'three';
import vertexShader from './shaders/vertex.glsl';
import fragmentShader from './shaders/fragment.glsl'
import gsap from "gsap"

import countries from './countries.json';
import atmosphereVertexShader from './shaders/atmosphereVertex.glsl';
import atmosphereFragmentShader from './shaders/atmosphereFragment.glsl'

const canvasContainer = document.querySelector('#canvasContainer')

// Initialize scene and camera.
const scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(
    75,
    canvasContainer.offsetWidth / canvasContainer.offsetHeight,
    0.1,
    1000
)

// Set up a renderer.
const renderer = new THREE.WebGL1Renderer({
    antialias: true,
    canvas: document.querySelector('canvas')
})

renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight)
renderer.setPixelRatio(window.devicePixelRatio)

// Create the sphere using globe texture.
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(5, 50, 50),
    new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        uniforms: {
            globeTexture: {
                value: new THREE.TextureLoader().load('public/globe.jpg')
            }
        }
    })
)

// Create atmosphere.
const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(5, 50, 50),
    new THREE.ShaderMaterial({
        vertexShader: atmosphereVertexShader,
        fragmentShader: atmosphereFragmentShader,
        blending : THREE.AdditiveBlending,
        side: THREE.BackSide
    })
)

atmosphere.scale.set(1.1, 1.1, 1.1)
scene.add(atmosphere)

const group = new THREE.Group()
group.add(sphere)
scene.add(group)

// Add stars to the scene.
const starGeometry = new THREE.BufferGeometry()
const starMaterial = new THREE.PointsMaterial({
    color: 0xffffff
})

const starVertices = []
for (let i = 0; i < 10000; i++) {
    const x = (Math.random() - 0.5) * 2000
    const y = (Math.random() - 0.5) * 2000
    const z = -Math.random() * 2000
    starVertices.push(x, y, z)

}

starGeometry.setAttribute('position',
    new THREE.Float32BufferAttribute(
        starVertices, 3)
)
const stars = new THREE.Points(
    starGeometry, starMaterial
)
scene.add(stars)

// Adjust camera position.
camera.position.z = 15

// Create boxes.
function createBoxes(countries) {
    countries.forEach(country => {

        // Make scale based on a billion population countries
        const scale = country.population / 1000000000
        const lat = country.latlng ? country.latlng[0] : null
        const lng = country.latlng ? country.latlng[1] : null
        const population = country.population
        const zScale = 0.8 * scale

        const box = new THREE.Mesh(
            new THREE.BoxGeometry(
                Math.max(0.1, 0.2 * scale),
                Math.max(0.1, 0.2 * scale),
                Math.max(zScale, 0.4 * Math.random())
            ),
            new THREE.MeshBasicMaterial({
                color: "#3BF7FF",
                opacity: 0.4,
                transparent: true
            })
        )

        // 23.6345° N, 102.5528° W - Mexico
        // JS Math si and cos works only with radiants not degrees.
        const latitude = (lat / 180) * Math.PI
        const longitude = (lng / 180) * Math.PI
        const radius = 5

        // Formulas for getting point location on a sphere.
        const x = radius * Math.cos(latitude) * Math.sin(longitude)
        const y = radius * Math.sin(latitude)
        const z = radius * Math.cos(latitude) * Math.cos(longitude)

        box.position.x = x
        box.position.y = y
        box.position.z = z

        box.lookAt(0, 0, 0)
        box.geometry.applyMatrix4(new THREE.Matrix4().makeTranslation(0, 0, -zScale/2))

        group.add(box)

        gsap.to(box.scale, {
            z: 1.4,
            duration: 2,
            yoyo: true,
            repeat: -1,
            ease: "linear",
            delay: Math.random()
        })

        box.country = country.name
        box.population = new Intl.NumberFormat().format(population)
    })
}

const mouse = {
    x: undefined,
    y: undefined,
    down: false
}

sphere.rotation.y = -Math.PI / 2

group.rotation.offset = {
    y: 0,
    x: 0
}

createBoxes(countries)

const raycaster = new THREE.Raycaster();
const popUpElement = document.querySelector("#popUpElement")
const populationElement = document.querySelector("#populationElement")
const populationElementValue = document.querySelector("#populationElementValue")


function animate() {

    requestAnimationFrame(animate)
    renderer.render(scene, camera)

    // Update the picking ray with the camera and pointer position.
	raycaster.setFromCamera( mouse, camera );

	// Calculate objects intersecting the picking ray.
	const intersects = raycaster.intersectObjects( group.children.filter(mesh => {
        return mesh.geometry.type === "BoxGeometry"
    }));
    group.children.forEach(mesh => {
        mesh.material.opacity = 0.4
    })

    gsap.set(popUpElement, {
        display: "none"
    })

	for ( let i = 0; i < intersects.length; i ++ ) {

        const box = intersects[i].object

        // Apply only on hover of our group.
        box.material.opacity = 1
        gsap.set(popUpElement, {
            display: "block"
        })

        // Make the element dynamic.
        populationElement.innerHTML = box.country
        populationElementValue.innerHTML = box.population
	}

	renderer.render( scene, camera );
}
animate()

addEventListener('resize', (event) => {
    renderer.setSize(canvasContainer.offsetWidth, canvasContainer.offsetHeight)
    camera = new THREE.PerspectiveCamera(
        75,
        canvasContainer.offsetWidth / canvasContainer.offsetHeight,
        0.1,
        1000
    )
    camera.position.z = 15
})

canvasContainer.addEventListener('mousedown', ({clientX, clientY}) => {
    mouse.down = true
    mouse.xPrev = clientX
    mouse.yPrev = clientY
})

addEventListener('mouseup', (event) => {
    mouse.down = false
})

addEventListener('mousemove', (event) => {

    if (innerWidth >= 1280) {
        // Normalise mouse coordinates on the screen.
        mouse.x = ((event.clientX - innerWidth / 2) / ( innerWidth / 2 )) * 2 - 1 
        mouse.y = -(event.clientY / innerHeight) * 2 + 1

    } else {
        const offset = canvasContainer.getBoundingClientRect().top
        // Normalise mouse coordinates on the screen.
        mouse.x = (event.clientX / innerWidth) * 2 - 1 
        mouse.y = -((event.clientY - offset) / innerHeight) * 2 + 1
        
    }

    gsap.set(popUpElement, {
        x: event.clientX,
        y: event.clientY,
    })

    if (mouse.down) {

        // Prevent selecting text when moving the mouse.
        event.preventDefault()

        // Delta is a difference between 2 values and we want to rotatate based on the diff.
        const deltaX = event.clientX - mouse.xPrev
        mouse.xPrev = event.clientX

        // Same thing for the rotation on x
        const deltaY = event.clientY - mouse.yPrev
        mouse.yPrev = event.clientY

        group.rotation.offset.x += deltaY * 0.005
        group.rotation.offset.y += deltaX * 0.005

        gsap.to(group.rotation, {
            y: group.rotation.offset.y,
            x: group.rotation.offset.x,
            duration: 2
        })
    }
})


addEventListener('touchend', (event) => {
    mouse.down = false
})

addEventListener('touchmove', (event) => {

    // In mobile we have touch events
    event.clientX = event.touches[0].clientX
    event.clientY = event.touches[0].clientY

    const doesIntersect = raycaster.intersectObject(sphere)

    // If we dont intersect the spere don't run rest of code.
    if (doesIntersect.length > 0) mouse.down = true

    if (mouse.down) {
        const offset = canvasContainer.getBoundingClientRect().top
        // Normalise mouse coordinates on the screen.
        mouse.x = (event.clientX / innerWidth) * 2 - 1
        mouse.y = -((event.clientY - offset) / innerHeight) * 2 + 1

        gsap.set(popUpElement, {
            x: event.clientX,
            y: event.clientY,
        })

        // Prevent selecting text when moving the mouse.
        event.preventDefault()

        // Delta is a difference between 2 values and we want to rotatate based on the diff.
        const deltaX = event.clientX - mouse.xPrev
        mouse.xPrev = event.clientX

        // Same thing for the rotation on x.
        const deltaY = event.clientY - mouse.yPrev
        mouse.yPrev = event.clientY

        group.rotation.offset.x += deltaY * 0.005
        group.rotation.offset.y += deltaX * 0.005

        gsap.to(group.rotation, {
            y: group.rotation.offset.y,
            x: group.rotation.offset.x,
            duration: 2
        })
    }
}, {passive: false})