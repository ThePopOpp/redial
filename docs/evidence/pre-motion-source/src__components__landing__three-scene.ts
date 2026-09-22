import * as THREE from 'three';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { clamp, timeline } from '@/lib/landing/timeline';

function roundedShape(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2, shape = new THREE.Shape();
  shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y); shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y); return shape;
}
export function createPhoneScene(mount: HTMLElement, readProgress: () => number, onLost: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.55;
  renderer.domElement.setAttribute('aria-hidden', 'true'); mount.append(renderer.domElement);
  const css = new CSS3DRenderer(); css.domElement.className = 'story-css-renderer'; mount.append(css.domElement);
  const scene = new THREE.Scene(), domScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 100); camera.position.set(0, 0, 11.5);
  const phone = new THREE.Group(), domPhone = new THREE.Group(); scene.add(phone); domScene.add(domPhone);
  scene.add(new THREE.AmbientLight(0xe5dcff, 2.1));
  const key = new THREE.DirectionalLight(0xece8ff, 5); key.position.set(-4, 6, 7); scene.add(key);
  const rim = new THREE.PointLight(0x9182ff, 65, 25); rim.position.set(5, 2, 3); scene.add(rim);
  const pink = new THREE.PointLight(0xdd90d8, 25, 20); pink.position.set(-4, -2, 4); scene.add(pink);
  const bodyGeometry = new THREE.ExtrudeGeometry(roundedShape(2.5, 5.08, .36), { depth: .14, bevelEnabled: true, bevelSegments: 5, steps: 1, bevelSize: .06, bevelThickness: .065, curveSegments: 18 });
  const body = new THREE.Mesh(bodyGeometry, new THREE.MeshStandardMaterial({ color: 0x67616f, metalness: .88, roughness: .25 })); phone.add(body);
  const face = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(2.43, 4.99, .32)), new THREE.MeshBasicMaterial({ color: 0x070709 })); face.position.z = .211; phone.add(face);
  const outline = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(roundedShape(2.45, 5.01, .33).getPoints(90)), new THREE.LineBasicMaterial({ color: 0xb5a3ec, transparent: true, opacity: .5 })); outline.position.z = .215; phone.add(outline);
  for (const [x, y, height] of [[-1.3, .9, .32], [-1.3, .35, .55], [1.3, .55, .72]]) {
    const button = new THREE.Mesh(new THREE.BoxGeometry(.045, height, .12), new THREE.MeshStandardMaterial({ color: 0x89838e, metalness: .85, roughness: .25 })); button.position.set(x, y, .03); phone.add(button);
  }
  const screenElement = document.createElement('div'); screenElement.className = 'story-screen-host'; screenElement.setAttribute('aria-hidden', 'true');
  const screen = new CSS3DObject(screenElement); screen.scale.setScalar(2.28 / 300); screen.position.z = .226; domPhone.add(screen);
  const atmosphere = new THREE.Group(); scene.add(atmosphere);
  const rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let index = 0; index < 3; index++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.5 + index * .65, .006, 5, 180), new THREE.MeshBasicMaterial({ color: index === 1 ? 0xa788ca : 0x847dff, transparent: true, opacity: .15 }));
    ring.rotation.set(.15 + index * .35, .35 + index * .25, -.3); ring.position.z = -1.8; atmosphere.add(ring); rings.push(ring);
  }
  const positions: number[] = [];
  for (let index = 0; index < 85; index++) { const theta = index * 2.39996; const radius = 2.7 + (index % 11) * .37; positions.push(Math.cos(theta) * radius, Math.sin(theta) * radius * .7, -1 - (index % 4) * .5); }
  const particles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)), new THREE.PointsMaterial({ color: 0xb8a6ff, size: .018, transparent: true, opacity: .5, depthWrite: false })); atmosphere.add(particles);
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(-5, -.6, -1), new THREE.Vector3(-2.8, 1.2, -1.5), new THREE.Vector3(0, -.8, -1), new THREE.Vector3(2.8, 1, -1), new THREE.Vector3(5, .1, -1)]);
  const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(130)), new THREE.LineBasicMaterial({ color: 0xb2a2f7, transparent: true, opacity: .3 })); atmosphere.add(route);
  const pulse = new THREE.Mesh(new THREE.SphereGeometry(.055, 12, 12), new THREE.MeshBasicMaterial({ color: 0xe6d4ff })); atmosphere.add(pulse);
  let width = 1, height = 1, frame = 0, active = true, disposed = false, lastProgress = -1;
  function resize() { width = mount.clientWidth; height = mount.clientHeight; if (!width || !height) return; renderer.setSize(width, height); css.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); lastProgress = -1; }
  const observer = new ResizeObserver(resize); observer.observe(mount); resize();
  const intersection = new IntersectionObserver(entries => { active = entries[0].isIntersecting; lastProgress = -1; }); intersection.observe(mount);
  const contextLost = (event: Event) => { event.preventDefault(); onLost(); }; renderer.domElement.addEventListener('webglcontextlost', contextLost);
  function draw() {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    const progress = readProgress();
    if (!active || document.hidden || Math.abs(progress - lastProgress) < .000001) return;
    lastProgress = progress;
    const state = timeline(progress, width < 768); const [x, y, z, rx, ry, rz, scale] = state.pose;
    // Keep the phone in the available composition on narrower desktop screens.
    const horizontal = width < 768 ? 0 : x * Math.min(1.2, Math.max(.6, camera.aspect / 1.65));
    phone.position.set(horizontal, y, z); phone.rotation.set(rx, ry, rz); phone.scale.setScalar(scale);
    domPhone.position.copy(phone.position); domPhone.rotation.copy(phone.rotation); domPhone.scale.copy(phone.scale);
    atmosphere.position.x = horizontal * .65;
    atmosphere.rotation.z = progress * .6; particles.rotation.z = -progress * .8;
    rings.forEach((ring, index) => { ring.rotation.z = progress * (index + 1) * .75; ring.material.opacity = (.10 + .08 * Math.sin(progress * Math.PI)) * (1 - state.formReveal); });
    route.material.opacity = (state.chapter === 1 || state.chapter === 6 ? .5 : .08) * (1 - state.formReveal);
    pulse.position.copy(path.getPoint(clamp((state.position % 1) * 1.3))); pulse.visible = state.chapter === 1 || state.chapter === 6;
    css.domElement.style.opacity = String(state.screenOpacity); renderer.domElement.style.opacity = String(state.sceneOpacity);
    renderer.render(scene, camera); css.render(domScene, camera);
    mount.dataset.progress = progress.toFixed(4); mount.dataset.rendered = 'true';
  }
  draw();
  return { screenElement, dispose() { disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); renderer.domElement.removeEventListener('webglcontextlost', contextLost); scene.traverse(object => { if ('geometry' in object) (object.geometry as THREE.BufferGeometry).dispose(); if ('material' in object) { const materials = Array.isArray(object.material) ? object.material : [object.material]; for (const material of materials) (material as THREE.Material).dispose(); } }); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); css.domElement.remove(); screenElement.remove(); } };
}
