// ============================================================
// main.js — Entry Point
// เริ่มต้น Scene, Camera, Renderer, Lights, Controls
// ประกอบนั่งร้าน, ติด Labels, ตั้งค่า Interaction
// ============================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { buildScaffold } from './scaffold-builder.js';
import { createLabels, toggleLabels } from './labels.js';
import { setupInteraction, updateCameraAnimation } from './interaction.js';

// ============================================================
// 1. SCENE
// ============================================================
const scene = new THREE.Scene();

// --- สร้างท้องฟ้าไล่สี (Gradient Sky) ---
const skyCanvas = document.createElement('canvas');
skyCanvas.width = 1;
skyCanvas.height = 512;
const skyCtx = skyCanvas.getContext('2d');
const skyGrad = skyCtx.createLinearGradient(0, 0, 0, 512);
skyGrad.addColorStop(0.0, '#1b4f8a');  // ท้องฟ้าสูง — น้ำเงินเข้ม
 skyGrad.addColorStop(0.25, '#4a90c4'); // กลางฟ้า — ฟ้าสดใส
skyGrad.addColorStop(0.5, '#87CEEB');  // ท้องฟ้าสีอ่อน
skyGrad.addColorStop(0.7, '#b0d8ef');  // ใกล้ขอบฟ้า
skyGrad.addColorStop(0.85, '#e8d5b7'); // ขอบฟ้า — สีอุ่น
skyGrad.addColorStop(1.0, '#c9b896');  // ติดพื้นดิน
skyCtx.fillStyle = skyGrad;
skyCtx.fillRect(0, 0, 1, 512);

const skyTexture = new THREE.CanvasTexture(skyCanvas);
skyTexture.mapping = THREE.EquirectangularReflectionMapping;
scene.background = skyTexture;

// หมอก (Fog) สีอุ่นใกล้สีฟ้า
 scene.fog = new THREE.FogExp2(0xb0d8ef, 0.008);

// ============================================================
// 2. CAMERA
// ============================================================
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(14, 10, 14);
camera.lookAt(0, 3, 0);

// ============================================================
// 3. WEBGL RENDERER
// ============================================================
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,  // ไม่ต้องโปร่งใส — ใช้ scene.background แทน
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const container = document.getElementById('viewport-container');
container.appendChild(renderer.domElement);

// ============================================================
// 4. CSS2D RENDERER (สำหรับ Labels)
// ============================================================
const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.top = '0';
labelRenderer.domElement.style.left = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
container.appendChild(labelRenderer.domElement);

// ============================================================
// 5. ORBIT CONTROLS (หมุน, ซูม, เลื่อน)
// ============================================================
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 3;
controls.maxDistance = 35;
controls.maxPolarAngle = Math.PI / 2 + 0.15; // เลยขอบฟ้าได้นิดหน่อย
controls.target.set(0, 3, 0);
controls.update();

// ============================================================
// 6. LIGHTING (จำลองแสงกลางแจ้ง)
// ============================================================

// Ambient — แสงรอบทิศ (สว่างขึ้นสำหรับกลางแจ้ง)
const ambientLight = new THREE.AmbientLight(0x6688aa, 0.6);
scene.add(ambientLight);

// Hemisphere — ท้องฟ้าสีฟ้า / พื้นดินสีน้ำตาล
 const hemiLight = new THREE.HemisphereLight(0x87CEEB, 0x8B7355, 0.7);
scene.add(hemiLight);

// Directional — แสงแดด (ทิศเฉียงขวาบน)
const dirLight = new THREE.DirectionalLight(0xfff5e0, 1.6);
dirLight.position.set(10, 18, 12);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 50;
dirLight.shadow.camera.left = -12;
dirLight.shadow.camera.right = 12;
dirLight.shadow.camera.top = 14;
dirLight.shadow.camera.bottom = -2;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

// Fill light — แสงเติมฝั่งตรงข้าม (สีฟ้าอ่อน)
const fillLight = new THREE.DirectionalLight(0x9dc4e8, 0.4);
fillLight.position.set(-6, 8, -6);
scene.add(fillLight);

// ============================================================
// 7. GROUND (พื้นดิน + Grid)
// ============================================================

// Grid Helper — เส้นตารางสีอ่อนบนพื้นดิน
const gridHelper = new THREE.GridHelper(60, 30, 0x9e8e70, 0x8a7a5a);
gridHelper.position.y = -0.005;
// GridHelper.material เป็น Array — ต้องเซ็ตทีละตัว
if (Array.isArray(gridHelper.material)) {
  gridHelper.material.forEach((m) => { m.opacity = 0.15; m.transparent = true; });
} else {
  gridHelper.material.opacity = 0.15;
  gridHelper.material.transparent = true;
}
scene.add(gridHelper);

// Ground Plane — พื้นดินสีน้ำตาล
 const groundGeo = new THREE.PlaneGeometry(120, 120);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x8B7355,
  roughness: 0.95,
  metalness: 0.0,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.02;
ground.receiveShadow = true;
scene.add(ground);

// ============================================================
// 8. BUILD SCAFFOLD (ประกอบนั่งร้าน)
// ============================================================
const scaffoldGroup = buildScaffold();
scene.add(scaffoldGroup);

// ============================================================
// 9. LABELS (ป้ายชื่อชิ้นส่วน)
// ============================================================
const labels = createLabels(scaffoldGroup);

// ============================================================
// 10. INTERACTION (คลิก/hover)
// ============================================================
setupInteraction(camera, scene, renderer.domElement, controls);

// ============================================================
// 11. UI EVENT LISTENERS
// ============================================================

// --- Label Toggle ---
const labelCheckbox = document.getElementById('toggle-labels');
if (labelCheckbox) {
  labelCheckbox.addEventListener('change', (e) => {
    toggleLabels(labels, e.target.checked);
  });
}



// ============================================================
// 12. HIDE LOADING SCREEN
// ============================================================
const loadingScreen = document.getElementById('loading-screen');
if (loadingScreen) {
  loadingScreen.classList.add('fade-out');
  setTimeout(() => {
    loadingScreen.remove();
  }, 700);
}

// ============================================================
// 13. ANIMATION LOOP
// ============================================================
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  updateCameraAnimation(); // อัพเดทการเคลื่อนกล้องซูมไปหาชิ้นส่วน
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}
animate();

// ============================================================
// 14. WINDOW RESIZE HANDLER
// ============================================================
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
});

console.log('🏗️ Scaffold 3D Model — Loaded Successfully');
