import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { clamp, formPreviewStart, formZoomEnd, mix, smooth, timeline } from '@/lib/landing/timeline';

function roundedShape(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2, shape = new THREE.Shape();
  shape.moveTo(x + radius, y); shape.lineTo(x + width - radius, y); shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius); shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height); shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius); shape.quadraticCurveTo(x, y, x + radius, y); return shape;
}
function radialTexture() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const offset = (y * size + x) * 4;
    data[offset] = data[offset + 1] = data[offset + 2] = 255;
    data[offset + 3] = Math.round(Math.pow(Math.max(0, 1 - Math.hypot(x - 31.5, y - 31.5) / 32), 2.5) * 255);
  }
  const texture = new THREE.DataTexture(data, size, size); texture.needsUpdate = true; return texture;
}

/** Original procedural geometry/textures. The call state is always scroll-driven. */
export function createPhoneScene(mount: HTMLElement, readProgress: () => number, onLost: () => void, onboarding: HTMLElement | null) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.65));
  renderer.setClearColor(0x000000, 0); renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-hidden', 'true'); mount.append(renderer.domElement);
  const css = new CSS3DRenderer(); css.domElement.className = 'story-css-renderer'; mount.append(css.domElement);
  const scene = new THREE.Scene(), domScene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, .1, 100); camera.position.set(0, 0, 11.5);
  const phone = new THREE.Group(), domPhone = new THREE.Group(); scene.add(phone); domScene.add(domPhone);
  // Broad studio reflections, generated locally without an external HDR download.
  const room = new RoomEnvironment(), pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(room, .045); scene.environment = environment.texture;
  room.dispose(); pmrem.dispose();
  scene.add(new THREE.AmbientLight(0xd3ccef, .6));
  const key = new THREE.DirectionalLight(0xfff5ea, 2.8); key.position.set(-4, 6, 7); scene.add(key);
  const rim = new THREE.PointLight(0x9182ff, 48, 25); rim.position.set(5, 2, 3); scene.add(rim);
  const fill = new THREE.PointLight(0xb0d3ff, 25, 20); fill.position.set(-4, -2, 4); scene.add(fill);
  const grain = new Uint8Array(64 * 64 * 4);
  for (let index = 0; index < 64 * 64; index++) {
    const value = 217 + ((index * 73 + Math.floor(index / 64) * 19) % 16);
    grain.set([value, value, value, 255], index * 4);
  }
  const grainMap = new THREE.DataTexture(grain, 64, 64); grainMap.wrapS = grainMap.wrapT = THREE.RepeatWrapping; grainMap.repeat.set(5, 10); grainMap.needsUpdate = true;
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x787782, metalness: .96, roughness: .28, roughnessMap: grainMap, clearcoat: .32, clearcoatRoughness: .18, envMapIntensity: .85, transparent: true });
  const darkMetal = new THREE.MeshPhysicalMaterial({ color: 0x34323e, metalness: .87, roughness: .25, clearcoat: .7, transparent: true });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x06070b, metalness: .05, roughness: .26, clearcoat: .3, clearcoatRoughness: .16, envMapIntensity: .16, transparent: true });
  const hardwareMaterials = [metal, darkMetal, glass];
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(roundedShape(2.5, 5.08, .36), { depth: .24, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: .065, bevelThickness: .075, curveSegments: 24 }), metal);
  body.position.z = -.10; phone.add(body);
  const back = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(2.43, 5, .33)), darkMetal); back.rotation.y = Math.PI; back.position.z = -.18; phone.add(back);
  const face = new THREE.Mesh(new THREE.ShapeGeometry(roundedShape(2.43, 4.99, .32)), glass); face.position.z = .222; phone.add(face);
  const bezel = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(roundedShape(2.45, 5.01, .33).getPoints(100)), new THREE.LineBasicMaterial({ color: 0xd8d4ed, transparent: true, opacity: .55 })); bezel.position.z = .224; phone.add(bezel);
  for (const [x, y, height] of [[-1.325, .9, .30], [-1.325, .34, .53], [1.325, .55, .72]]) {
    const button = new THREE.Mesh(new THREE.BoxGeometry(.048, height, .16), metal); button.position.set(x, y, .02); phone.add(button);
  }
  for (const x of [-1.285, 1.285]) for (const y of [-1.7, 1.7]) {
    const antenna = new THREE.Mesh(new THREE.BoxGeometry(.065, .027, .24), darkMetal); antenna.position.set(x, y, .02); phone.add(antenna);
  }
  const screenElement = document.createElement('div'); screenElement.className = 'story-screen-host'; screenElement.setAttribute('aria-hidden', 'true');
  const screen = new CSS3DObject(screenElement); screen.scale.setScalar(2.28 / 300); screen.position.z = .23; domPhone.add(screen);
  // The per-vertex distance makes the bright drawing head travel the contours.
  const traceMaterial = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uDraw: { value: 0 }, uOpacity: { value: 0 }, uTint: { value: new THREE.Color(0xbdaaff) } },
    vertexShader: 'attribute float aProgress; varying float vProgress; void main(){ vProgress=aProgress; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
    fragmentShader: 'uniform float uDraw; uniform float uOpacity; uniform vec3 uTint; varying float vProgress; void main(){ float drawn=1.0-smoothstep(uDraw-.018,uDraw+.008,vProgress); float head=exp(-abs(vProgress-uDraw)*65.0); gl_FragColor=vec4(mix(uTint,vec3(1.0),head*.85),drawn*uOpacity*(.6+head*.4)); }',
  });
  const drawing = new THREE.Group(); phone.add(drawing);
  function trace(points: THREE.Vector3[], delay = 0) {
    const geometry = new THREE.BufferGeometry().setFromPoints(points), lengths = [0];
    for (let index = 1; index < points.length; index++) lengths.push(lengths[index - 1] + points[index].distanceTo(points[index - 1]));
    geometry.setAttribute('aProgress', new THREE.Float32BufferAttribute(lengths.map(length => delay + length / (lengths.at(-1) || 1) * (1 - delay)), 1));
    const line = new THREE.Line(geometry, traceMaterial); line.renderOrder = 5; drawing.add(line); return line;
  }
  function contour(width: number, height: number, radius: number, z: number, delay = 0, y = 0) {
    return trace(roundedShape(width, height, radius).getPoints(100).map(point => new THREE.Vector3(point.x, point.y + y, z)), delay);
  }
  contour(2.62, 5.2, .4, .15); contour(2.62, 5.2, .4, -.18, .05); contour(2.30, 4.76, .29, .24, .12);
  contour(.63, .18, .08, .25, .3, 2.16);
  for (const y of [1.33, .35, -.64]) contour(1.84, .70, .09, .25, .3, y);
  for (const y of [1.45, 1.25, .48, .28, -.53, -.73]) trace([new THREE.Vector3(-.72, y, .26), new THREE.Vector3(y % 1 > .3 ? .56 : .34, y, .26)], .5);
  for (let index = 0; index < 4; index++) { const line = contour(.36, .40, .06, .25, .55, -1.7); line.position.x = -.72 + index * .48; }
  for (const x of [-1.3, 1.3]) for (const y of [-2.2, 2.2]) trace([new THREE.Vector3(x, y, -.18), new THREE.Vector3(x, y, .15)], .2);
  const glowMap = radialTexture();
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0x7f62d9, transparent: true, opacity: .19, depthWrite: false })); halo.position.z = -1.6; halo.scale.set(9, 11, 1); scene.add(halo);
  const shadow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0x000000, transparent: true, opacity: .55, depthWrite: false })); shadow.position.set(0, -3.15, -1); shadow.scale.set(5.6, .85, 1); scene.add(shadow);
  const atmosphere = new THREE.Group(); scene.add(atmosphere);
  const rings: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>[] = [];
  for (let index = 0; index < 3; index++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.45 + index * .65, .006, 5, 180), new THREE.MeshBasicMaterial({ color: 0xa79aff, transparent: true, opacity: .16 }));
    ring.rotation.set(.4 + index * .35, .35 + index * .25, -.3); ring.position.z = -2; atmosphere.add(ring); rings.push(ring);
  }
  const positions: number[] = [];
  for (let index = 0; index < 110; index++) { const theta = index * 2.39996, radius = 2.7 + (index % 11) * .37; positions.push(Math.cos(theta) * radius, Math.sin(theta) * radius, -1 - (index % 5) * .5); }
  const particles = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)), new THREE.PointsMaterial({ map: glowMap, color: 0xb8a6ff, size: .055, transparent: true, opacity: .65, depthWrite: false })); atmosphere.add(particles);
  const path = new THREE.CatmullRomCurve3([new THREE.Vector3(-5, -.6, -1), new THREE.Vector3(-2.8, 1.2, -1.5), new THREE.Vector3(0, -.8, -1), new THREE.Vector3(2.8, 1, -1), new THREE.Vector3(5, .1, -1)]);
  const route = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path.getPoints(130)), new THREE.LineBasicMaterial({ color: 0xb2a2f7, transparent: true, opacity: .3 })); atmosphere.add(route);
  const pulse = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowMap, color: 0xe6d4ff, transparent: true, depthWrite: false })); pulse.scale.setScalar(.27); atmosphere.add(pulse);
  const cursor = document.createElement('div'); cursor.className = 'story-pointer'; cursor.setAttribute('aria-hidden', 'true'); mount.append(cursor);
  const stage = mount.parentElement!, finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let width = 1, height = 1, frame = 0, active = true, disposed = false, dirty = true, lastProgress = -1;
  let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0, cursorX = 0, cursorY = 0, cursorTargetX = 0, cursorTargetY = 0;
  const resetPointer = () => { if (targetX || targetY || cursor.dataset.visible === 'true') dirty = true; targetX = targetY = 0; cursor.dataset.visible = 'false'; };
  const movePointer = (event: PointerEvent) => {
    if (event.pointerType !== 'mouse' || !finePointer.matches || !active) return;
    const rect = mount.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    if (x < 0 || x > rect.width || y < 0 || y > rect.height || readProgress() > .97) { resetPointer(); return; }
    targetX = x / rect.width * 2 - 1; targetY = y / rect.height * 2 - 1; cursorTargetX = x; cursorTargetY = y;
    if (cursor.dataset.visible !== 'true') { cursorX = x; cursorY = y; }
    cursor.dataset.visible = 'true'; cursor.dataset.hover = String(!!(event.target as Element).closest('button,a')); dirty = true;
  };
  window.addEventListener('pointermove', movePointer, { passive: true }); document.addEventListener('pointerleave', resetPointer); window.addEventListener('blur', resetPointer);
  function resize() { width = mount.clientWidth; height = mount.clientHeight; if (!width || !height) return; renderer.setSize(width, height); css.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix(); dirty = true; }
  const observer = new ResizeObserver(resize); observer.observe(mount); resize();
  const intersection = new IntersectionObserver(entries => { active = entries[0].isIntersecting; dirty = true; if (!active) resetPointer(); }); intersection.observe(mount);
  const themeObserver = new MutationObserver(() => { dirty = true; }); themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  const contextLost = (event: Event) => { event.preventDefault(); onLost(); }; renderer.domElement.addEventListener('webglcontextlost', contextLost);
  const tint = new THREE.Color(), white = new THREE.Color(0xffffff);
  function draw() {
    if (disposed) return;
    frame = requestAnimationFrame(draw);
    const progress = readProgress();
    if (onboarding?.dataset.embedded === 'true' && (progress < formPreviewStart / 9 || progress >= formZoomEnd / 9)) { onboarding.dataset.embedded = 'false'; onboarding.removeAttribute('style'); }
    const unsettled = Math.abs(targetX - pointerX) + Math.abs(targetY - pointerY) > .0002 || Math.abs(cursorTargetX - cursorX) + Math.abs(cursorTargetY - cursorY) > .05;
    if (!active || document.hidden || (!dirty && !unsettled && Math.abs(progress - lastProgress) < .000001)) return;
    dirty = false; lastProgress = progress;
    pointerX += (targetX - pointerX) * .095; pointerY += (targetY - pointerY) * .095;
    cursorX += (cursorTargetX - cursorX) * .19; cursorY += (cursorTargetY - cursorY) * .19;
    cursor.style.transform = `translate3d(${cursorX}px,${cursorY}px,0)`;
    if (progress > .97) cursor.dataset.visible = 'false';
    stage.style.setProperty('--pointer-x', String(pointerX)); stage.style.setProperty('--pointer-y', String(pointerY));
    screenElement.style.setProperty('--gloss-x', `${50 + pointerX * 35}%`); screenElement.style.setProperty('--gloss-y', `${15 + pointerY * 30}%`);
    const mobile = width < 768, state = timeline(progress, mobile);
    const formWidth = Math.min(740, width - (mobile ? 32 : 48));
    if (state.position >= formPreviewStart) {
      // Zoom an upright, solid device toward the actual form's natural layout.
      // Solving the perspective projection gives an exact, jump-free endpoint.
      const focal = height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
      const targetScale = formWidth * (state.cameraZ + .4) / (2.28 * focal + .23 * formWidth);
      const targetY = (height / 2 - (mobile ? 35 : 55)) * (2.28 * targetScale / formWidth) - 2.356 * targetScale;
      state.pose = [0, mix(mobile ? -1.6 : -.7, targetY, state.zoom), -.4, 0, 0, 0, mix(mobile ? .85 * .64 : .85, targetScale, state.zoom)];
    }
    const [x, y, z, rx, ry, rz, scale] = state.pose;
    const horizontal = mobile ? 0 : x * clamp(camera.aspect / 1.65, .6, 1.2), parallax = (1 - smooth((state.position - 7.8) / .2)) * (mobile ? .25 : 1);
    phone.position.set(horizontal + pointerX * .085 * parallax, y - pointerY * .07 * parallax, z);
    phone.rotation.set(rx + pointerY * .065 * parallax, ry + pointerX * .11 * parallax, rz - pointerX * .025 * parallax); phone.scale.setScalar(scale);
    domPhone.position.copy(phone.position); domPhone.rotation.copy(phone.rotation); domPhone.scale.copy(phone.scale); camera.position.z = state.cameraZ;
    tint.setRGB(state.tone[0] / 255, state.tone[1] / 255, state.tone[2] / 255, THREE.SRGBColorSpace);
    rim.color.copy(tint); rim.position.set(4 + pointerX * 3, 3 - pointerY * 2 - state.travel, 4);
    key.position.x = -4 + pointerX * 2; fill.position.y = -2 + Math.sin(state.position) * 2;
    // A matching solid DOM rim takes over near the endpoint so the device can
    // continue around longer form steps below the canvas viewport.
    const formRim = smooth((state.position - 8.82) / .16);
    hardwareMaterials.forEach(material => { material.opacity = (1 - state.outline) * state.phoneOpacity * (1 - formRim); material.depthWrite = state.outline < .5 && state.phoneOpacity > .99 && formRim < .01; }); bezel.material.opacity = .6 * (1 - state.outline) * state.phoneOpacity * (1 - formRim);
    traceMaterial.uniforms.uDraw.value = state.traceDraw * 1.04; traceMaterial.uniforms.uOpacity.value = state.outline * state.phoneOpacity; traceMaterial.uniforms.uTint.value.copy(tint).lerp(white, .3); drawing.visible = state.outline * state.phoneOpacity > .002;
    halo.position.set(horizontal, y * .45, -1.6); halo.material.color.copy(tint); halo.material.opacity = (.20 + state.outline * .12) * (1 - state.formReveal);
    shadow.position.x = horizontal; shadow.material.opacity = (document.documentElement.classList.contains('light') ? .30 : .6) * (1 - state.outline * .65) * (1 - state.formReveal) * state.phoneOpacity;
    atmosphere.position.set(horizontal * .5 - pointerX * .22, -state.travel * .6 + pointerY * .16, -3); atmosphere.rotation.z = progress * .6; particles.rotation.z = -progress * .8; particles.position.y = -state.position * .10; particles.material.color.copy(tint);
    rings.forEach((ring, index) => { ring.rotation.z = progress * (index + 1) * .75; ring.rotation.x = .4 + index * .35 + state.position * .04; ring.material.color.copy(tint); ring.material.opacity = (.10 + state.outline * .15) * (1 - state.formReveal); });
    route.material.color.copy(tint); route.material.opacity = (state.chapter === 1 || state.chapter === 6 ? .45 : .06) * (1 - state.formReveal);
    pulse.position.copy(path.getPoint(clamp((state.position % 1) * 1.3))); pulse.visible = state.chapter === 1 || state.chapter === 6;
    css.domElement.style.opacity = String((state.position >= formPreviewStart ? 0 : state.screenOpacity) * (1 - smooth((state.outline - .12) / .82)) * state.phoneOpacity);
    screenElement.style.filter = `blur(${state.outline * 5}px)`; renderer.domElement.style.opacity = String(state.sceneOpacity);
    if (state.sceneOpacity > .001) renderer.render(scene, camera);
    css.render(domScene, camera);
    if (onboarding) {
      if (state.position >= formPreviewStart && state.position < formZoomEnd) {
        // One real form, projected onto the screen. Never clone inputs or remount
        // the form; the same DOM returns to normal flow at the zoom endpoint.
        const bounds = screenElement.getBoundingClientRect();
        onboarding.dataset.embedded = 'true';
        onboarding.style.cssText = `width:${formWidth}px;height:${formWidth * 620 / 300}px;transform:translate3d(${bounds.left}px,${bounds.top}px,0) scale(${bounds.width / formWidth});border-radius:${formWidth * .12}px;--device-rim-opacity:${formRim};`;
      } else {
        onboarding.dataset.embedded = 'false'; onboarding.removeAttribute('style');
      }
    }
    mount.dataset.progress = progress.toFixed(4); mount.dataset.rendered = 'true'; mount.dataset.outline = state.outline.toFixed(3); mount.dataset.trace = state.traceDraw.toFixed(3); mount.dataset.phoneOpacity = state.phoneOpacity.toFixed(3); mount.dataset.pointer = `${pointerX.toFixed(3)},${pointerY.toFixed(3)}`;
  }
  draw();
  return { screenElement, dispose() {
    if (onboarding) { onboarding.dataset.embedded = 'false'; onboarding.removeAttribute('style'); }
    disposed = true; cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect(); themeObserver.disconnect();
    window.removeEventListener('pointermove', movePointer); document.removeEventListener('pointerleave', resetPointer); window.removeEventListener('blur', resetPointer);
    stage.style.removeProperty('--pointer-x'); stage.style.removeProperty('--pointer-y'); renderer.domElement.removeEventListener('webglcontextlost', contextLost);
    const materials = new Set<THREE.Material>();
    scene.traverse(object => { if ('geometry' in object) (object.geometry as THREE.BufferGeometry).dispose(); if ('material' in object) for (const material of Array.isArray(object.material) ? object.material : [object.material]) materials.add(material as THREE.Material); });
    materials.forEach(material => material.dispose()); environment.dispose(); grainMap.dispose(); glowMap.dispose();
    renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove(); css.domElement.remove(); screenElement.remove(); cursor.remove();
  } };
}
