// ============================================================
// interaction.js — Raycaster สำหรับ hover/click บนชิ้นส่วน 3D
// แสดงข้อมูลสเปกใน Info Panel + ซูมกล้องไปที่ชิ้นส่วน
// ============================================================

import * as THREE from 'three';
import { SCAFFOLD_SPECS } from './specs-data.js';

// --- State ---
let hoveredMesh = null;
let selectedMesh = null;
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// --- Camera Animation State ---
let _controls = null;
let _camera = null;
let isAnimating = false;
const animTarget = new THREE.Vector3();
const animCamPos = new THREE.Vector3();
let animProgress = 0;
const ANIM_SPEED = 0.04; // ความเร็วการเคลื่อนกล้อง (0-1)

/**
 * ค้นหา mesh ที่มี componentId โดยไล่ขึ้น parent chain
 */
function findComponentObject(object) {
  let current = object;
  while (current) {
    if (current.userData && current.userData.componentId) {
      return current;
    }
    current = current.parent;
  }
  return null;
}

/**
 * ตั้ง emissive ให้ mesh และ children ทั้งหมด
 */
function setEmissive(object, color) {
  if (!object) return;
  if (object.isMesh && object.material && object.material.emissive) {
    object.material = object.material.clone();
    object.material.emissive.setHex(color);
  }
  if (object.children) {
    object.children.forEach((child) => setEmissive(child, color));
  }
}

/**
 * คำนวณตำแหน่งโลกของ object
 */
function getWorldPosition(object) {
  const pos = new THREE.Vector3();
  object.getWorldPosition(pos);
  return pos;
}

/**
 * ซูมกล้องไปที่ชิ้นส่วนที่เลือก (smooth animation)
 */
function zoomToObject(object) {
  if (!_controls || !_camera) return;

  const targetPos = getWorldPosition(object);

  // คำนวณขนาดของ object เพื่อกำหนดระยะห่างกล้อง
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const distance = Math.max(maxDim * 4, 2.5); // ระยะห่างขั้นต่ำ 2.5m

  // คำนวณทิศทางจากกล้องปัจจุบันไปยัง target
  const direction = new THREE.Vector3();
  direction.subVectors(_camera.position, targetPos).normalize();

  // ตำแหน่งกล้องใหม่: ห่างจาก target ตาม direction
  animTarget.copy(targetPos);
  animCamPos.copy(targetPos).add(direction.multiplyScalar(distance));

  // เริ่ม animation
  animProgress = 0;
  isAnimating = true;
}

/**
 * อัพเดท camera animation (เรียกทุก frame จาก main.js)
 */
export function updateCameraAnimation() {
  if (!isAnimating || !_controls || !_camera) return;

  animProgress += ANIM_SPEED;
  if (animProgress >= 1) {
    animProgress = 1;
    isAnimating = false;
  }

  // Smooth ease-out interpolation
  const t = 1 - Math.pow(1 - animProgress, 3);

  // Lerp controls target (จุดที่กล้องมองไป)
  _controls.target.lerp(animTarget, t * 0.15);

  // Lerp camera position (ตำแหน่งกล้อง)
  _camera.position.lerp(animCamPos, t * 0.15);

  _controls.update();
}

/**
 * แสดงข้อมูลสเปก + วิธีติดตั้งใน Info Panel
 */
function showInfoPanel(componentId) {
  const spec = SCAFFOLD_SPECS[componentId];
  if (!spec) return;

  document.getElementById('component-icon').textContent = spec.icon;
  document.getElementById('component-name-th').textContent = spec.nameTH;
  document.getElementById('component-name-en').textContent = spec.nameEN;
  document.getElementById('component-standard').textContent = spec.standard;
  document.getElementById('component-description').textContent = spec.description;

  // สเปก
  const specsContainer = document.getElementById('component-specs');
  specsContainer.innerHTML = '';
  spec.specs.forEach((s) => {
    const row = document.createElement('div');
    row.className = 'spec-row';
    row.innerHTML = `
      <span class="spec-label">${s.label}</span>
      <span class="spec-value">${s.value}</span>
    `;
    specsContainer.appendChild(row);
  });

  // วิธีติดตั้ง (Installation Guide)
  const installContainer = document.getElementById('component-installation');
  if (installContainer && spec.installation) {
    installContainer.innerHTML = '';
    spec.installation.forEach((step, i) => {
      const stepEl = document.createElement('div');
      stepEl.className = 'install-step';
      stepEl.innerHTML = `
        <span class="step-num">${i + 1}</span>
        <span class="step-text">${step}</span>
      `;
      installContainer.appendChild(stepEl);
    });
    // แสดง section
    document.getElementById('installation-section').classList.remove('hidden');
  } else if (document.getElementById('installation-section')) {
    document.getElementById('installation-section').classList.add('hidden');
  }

  // ข้อควรระวัง (Safety warnings)
  const warningContainer = document.getElementById('component-warnings');
  if (warningContainer && spec.warnings) {
    warningContainer.innerHTML = '';
    spec.warnings.forEach((w) => {
      const wEl = document.createElement('div');
      wEl.className = 'warning-item';
      wEl.innerHTML = `<span class="warning-icon">⚠️</span><span>${w}</span>`;
      warningContainer.appendChild(wEl);
    });
    document.getElementById('warnings-section').classList.remove('hidden');
  } else if (document.getElementById('warnings-section')) {
    document.getElementById('warnings-section').classList.add('hidden');
  }

  document.getElementById('info-panel').classList.remove('hidden');
}

/**
 * ซ่อน Info Panel
 */
function hideInfoPanel() {
  document.getElementById('info-panel').classList.add('hidden');
}

/**
 * ยกเลิก selection
 */
function clearSelection() {
  if (selectedMesh) {
    setEmissive(selectedMesh, 0x000000);
    selectedMesh = null;
  }
}

/**
 * ตั้งค่า Interaction (hover + click + zoom + close button)
 * @param {THREE.Camera} camera
 * @param {THREE.Scene} scene
 * @param {HTMLCanvasElement} rendererDom
 * @param {OrbitControls} controls — สำหรับ camera zoom animation
 */
export function setupInteraction(camera, scene, rendererDom, controls) {
  _camera = camera;
  _controls = controls;

  // --- Mouse Move: Hover Effect ---
  rendererDom.addEventListener('mousemove', (event) => {
    const rect = rendererDom.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let found = null;
    for (const hit of intersects) {
      const comp = findComponentObject(hit.object);
      if (comp) {
        found = comp;
        break;
      }
    }

    if (found !== hoveredMesh) {
      if (hoveredMesh && hoveredMesh !== selectedMesh) {
        setEmissive(hoveredMesh, 0x000000);
      }
      hoveredMesh = found;
      if (hoveredMesh && hoveredMesh !== selectedMesh) {
        setEmissive(hoveredMesh, 0x222222);
      }
    }

    rendererDom.style.cursor = found ? 'pointer' : 'default';
  });

  // --- Click: Select + Show Info + Zoom ---
  rendererDom.addEventListener('click', (event) => {
    const rect = rendererDom.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(scene.children, true);

    let found = null;
    for (const hit of intersects) {
      const comp = findComponentObject(hit.object);
      if (comp) {
        found = comp;
        break;
      }
    }

    if (found) {
      clearSelection();
      selectedMesh = found;
      setEmissive(selectedMesh, 0x444444);
      showInfoPanel(found.userData.componentId);
      zoomToObject(found); // ซูมไปหาชิ้นส่วน
    } else {
      clearSelection();
      hideInfoPanel();
    }
  });

  // --- Close Button ---
  const closeBtn = document.getElementById('close-panel');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      clearSelection();
      hideInfoPanel();
    });
  }
}
