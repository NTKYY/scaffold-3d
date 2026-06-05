// ============================================================
// labels.js — CSS2D Labels ลอยบนโมเดลนั่งร้าน
// แสดงชื่อชิ้นส่วน (ไทย + อังกฤษ) ติดอยู่บน mesh ตัวแทน
// ============================================================

import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { SCAFFOLD_SPECS } from './specs-data.js';

/**
 * สร้าง CSS2D Labels สำหรับชิ้นส่วนแต่ละประเภท
 * ค้นหา mesh ตัวแทน 1 ชิ้นต่อ componentId แล้วผูก label
 * @param {THREE.Group} scaffoldGroup กลุ่มนั่งร้านทั้งหมด
 * @returns {CSS2DObject[]} อาร์เรย์ของ label ที่สร้างขึ้น
 */
export function createLabels(scaffoldGroup) {
  const labels = [];
  const foundIds = new Set();

  // ค้นหา mesh ตัวแทนสำหรับแต่ละ componentId
  scaffoldGroup.traverse((child) => {
    const cid = child.userData?.componentId;
    if (!cid || foundIds.has(cid)) return;
    if (!SCAFFOLD_SPECS[cid]) return;

    foundIds.add(cid);

    const spec = SCAFFOLD_SPECS[cid];

    // สร้าง HTML element สำหรับ label
    const div = document.createElement('div');
    div.className = 'scaffold-label';
    div.innerHTML = `
      <span>${spec.nameTH}</span>
      <span class="label-en">${spec.nameEN}</span>
    `;

    const labelObj = new CSS2DObject(div);
    labelObj.position.set(0, 0.15, 0); // ลอยขึ้นเล็กน้อยจากจุดยึด
    labelObj.name = `label-${cid}`;

    child.add(labelObj);
    labels.push(labelObj);
  });

  return labels;
}

/**
 * เปิด/ปิดแสดง labels ทั้งหมด
 * @param {CSS2DObject[]} labels อาร์เรย์ของ label
 * @param {boolean} visible true = แสดง, false = ซ่อน
 */
export function toggleLabels(labels, visible) {
  labels.forEach((label) => {
    label.visible = visible;
    if (label.element) {
      if (visible) {
        label.element.classList.remove('hidden');
      } else {
        label.element.classList.add('hidden');
      }
    }
  });
}
