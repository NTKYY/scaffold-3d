// ============================================================
// components.js — Factory functions สร้าง 3D Mesh ชิ้นส่วนนั่งร้าน
// ใช้ Three.js สร้าง Geometry + Material สำหรับแต่ละชิ้นส่วน
// ============================================================

import * as THREE from 'three';
import { SCAFFOLD_CONFIG as CFG, COMPONENT_COLORS as COLORS } from './specs-data.js';

// --- Shared Materials (สร้างครั้งเดียว ใช้ซ้ำ) ---
const materials = {
  steel: (color) => new THREE.MeshStandardMaterial({
    color,
    metalness: 0.7,
    roughness: 0.35,
  }),
  wood: (color) => new THREE.MeshStandardMaterial({
    color,
    metalness: 0.0,
    roughness: 0.85,
  }),
  flat: (color) => new THREE.MeshStandardMaterial({
    color,
    metalness: 0.1,
    roughness: 0.6,
    side: THREE.DoubleSide,
  }),
};

// Cache materials ที่ใช้บ่อย
const matSteel       = materials.steel(COLORS.standard);
const matBracing     = materials.steel(COLORS.bracing);
const matGuardRail   = materials.steel(COLORS.guardRail);
const matBasePlate   = materials.steel(COLORS.basePlate);
const matCouplerF    = materials.steel(COLORS.couplerFixed);
const matCouplerS    = materials.steel(COLORS.couplerSwivel);
const matPlank       = materials.wood(COLORS.plank);
const matSoleBoard   = materials.wood(COLORS.soleBoard);
const matToeBoard    = materials.wood(COLORS.toeBoard);
const matLadderRail  = materials.steel(COLORS.ladder);
const matLadderRung  = materials.steel(COLORS.ladderRung);
const matBolt = new THREE.MeshStandardMaterial({
  color: 0x999999,
  metalness: 0.85,
  roughness: 0.2,
});

// Tube segments (ความละเอียดของท่อกลม)
const TUBE_SEGMENTS = 12;

// --- Helper: ตั้ง userData ให้ Mesh ---
function setComponent(mesh, componentId) {
  mesh.userData = { componentId };
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

// ให้ Group ทั้งหมดมี componentId ด้วย (สำหรับ raycaster ค้นหาขึ้น parent)
function setGroupComponent(group, componentId) {
  group.userData = { componentId };
  group.traverse((child) => {
    if (child.isMesh) {
      child.userData = { componentId };
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return group;
}

// ============================================================
// Factory Functions
// ============================================================

/**
 * เสาตั้ง (Standard) — ท่อแนวตั้ง
 * @param {number} height ความสูง (m)
 */
export function createStandard(height) {
  const geo = new THREE.CylinderGeometry(CFG.tube.radius, CFG.tube.radius, height, TUBE_SEGMENTS);
  const mesh = new THREE.Mesh(geo, matSteel);
  return setComponent(mesh, 'standard');
}

/**
 * ตงยาว (Ledger) — ท่อแนวนอนตามยาว (แกน X)
 * @param {number} length ความยาว (m)
 */
export function createLedger(length) {
  const geo = new THREE.CylinderGeometry(CFG.tube.radius, CFG.tube.radius, length, TUBE_SEGMENTS);
  const mesh = new THREE.Mesh(geo, matSteel);
  mesh.rotation.z = Math.PI / 2; // หมุนให้นอนตามแกน X
  return setComponent(mesh, 'ledger');
}

/**
 * ตงขวาง (Transom) — ท่อแนวนอนขวาง (แกน Z)
 * @param {number} length ความยาว (m)
 */
export function createTransom(length) {
  const geo = new THREE.CylinderGeometry(CFG.tube.radius, CFG.tube.radius, length, TUBE_SEGMENTS);
  const mesh = new THREE.Mesh(geo, matSteel);
  mesh.rotation.x = Math.PI / 2; // หมุนให้นอนตามแกน Z
  return setComponent(mesh, 'transom');
}

/**
 * ทะแยง (Bracing) — ท่อเฉียงค้ำยัน
 * @param {number} length ความยาวท่อ (m)
 */
export function createBracing(length) {
  const geo = new THREE.CylinderGeometry(CFG.tube.radius, CFG.tube.radius, length, TUBE_SEGMENTS);
  const mesh = new THREE.Mesh(geo, matBracing);
  return setComponent(mesh, 'bracing');
}

/**
 * ฐานรองตีนเสา (Base Plate)
 */
export function createBasePlate() {
  const group = new THREE.Group();

  // แผ่นฐาน
  const plateGeo = new THREE.BoxGeometry(CFG.basePlate.size, CFG.basePlate.thickness, CFG.basePlate.size);
  const plate = new THREE.Mesh(plateGeo, matBasePlate);
  group.add(plate);

  // สลักกลาง (Spigot)
  const spigotGeo = new THREE.CylinderGeometry(
    CFG.basePlate.spigotDia / 2,
    CFG.basePlate.spigotDia / 2,
    CFG.basePlate.spigotHeight,
    8
  );
  const spigot = new THREE.Mesh(spigotGeo, matBasePlate);
  spigot.position.y = (CFG.basePlate.thickness + CFG.basePlate.spigotHeight) / 2;
  group.add(spigot);

  return setGroupComponent(group, 'basePlate');
}

/**
 * ไม้รองฐาน (Sole Board)
 * @param {number} length ความยาว (m)
 */
export function createSoleBoard(length) {
  const geo = new THREE.BoxGeometry(length, CFG.soleBoard.thickness, CFG.soleBoard.width);
  const mesh = new THREE.Mesh(geo, matSoleBoard);
  return setComponent(mesh, 'soleBoard');
}

/**
 * แผ่นปูพื้น (Platform Plank)
 * แผ่นวางตามยาว bay (แกน X) เรียงกันตามความกว้างนั่งร้าน (แกน Z)
 * @param {number} bayLen ความยาวตาม bay (m)
 */
export function createPlank(bayLen) {
  // X = ยาวตาม bay, Y = หนา, Z = กว้าง 225mm
  const geo = new THREE.BoxGeometry(bayLen, CFG.plank.thickness, CFG.plank.width);
  const mesh = new THREE.Mesh(geo, matPlank);
  return setComponent(mesh, 'plank');
}

/**
 * ราวกันตก (Guard Rail)
 * @param {number} length ความยาว (m)
 * @param {boolean} isTop true = ราวบน, false = ราวกลาง
 * @param {string} direction 'x' หรือ 'z'
 */
export function createGuardRail(length, isTop = true, direction = 'x') {
  const geo = new THREE.CylinderGeometry(CFG.tube.radius, CFG.tube.radius, length, TUBE_SEGMENTS);
  const mesh = new THREE.Mesh(geo, matGuardRail);
  if (direction === 'x') {
    mesh.rotation.z = Math.PI / 2;
  } else {
    mesh.rotation.x = Math.PI / 2;
  }
  return setComponent(mesh, isTop ? 'guardRailTop' : 'guardRailMid');
}

/**
 * แผ่นกันของตก (Toe Board)
 * @param {number} length ความยาว (m)
 * @param {string} direction 'x' หรือ 'z'
 */
export function createToeBoard(length, direction = 'x') {
  let geo;
  if (direction === 'x') {
    geo = new THREE.BoxGeometry(length, CFG.toeBoard.height, CFG.toeBoard.thickness);
  } else {
    geo = new THREE.BoxGeometry(CFG.toeBoard.thickness, CFG.toeBoard.height, length);
  }
  const mesh = new THREE.Mesh(geo, matToeBoard);
  return setComponent(mesh, 'toeBoard');
}

/**
 * บันได (Ladder) — Internal Ladder สำหรับ Ladder Bay ภายในนั่งร้าน
 * มุมเอียง ~75° (อัตราส่วน 4:1 — ยื่นออก 1 ส่วน ต่อความสูง 4 ส่วน)
 * บันไดวางในระนาบ XZ: จุด pivot ที่ฐาน (0,0,0)
 * รางเอียงขึ้นตามแกน Y, ยื่นออกตามแกน X
 * ขั้นบันไดเป็นแนวนอน (ตามแกน Z)
 * ยื่นเหนือพื้นชาน 1.0m เพื่อจับ
 * @param {number} verticalHeight ความสูงที่ต้องปีน (m)
 */
export function createLadder(verticalHeight) {
  const group = new THREE.Group();

  // มุม 75° จากแนวนอน (4:1 ratio)
  const angleRad = 75 * Math.PI / 180;
  const extension = 1.0; // ยื่นเหนือพื้นชาน 1m สำหรับจับ
  const totalVertical = verticalHeight + extension;
  const horizontalDist = totalVertical / Math.tan(angleRad); // ~0.54m ต่อ 2m สูง
  const ladderLength = totalVertical / Math.sin(angleRad);
  const halfWidth = CFG.ladder.width / 2;
  const railAngle = angleRad; // มุมจากแนวนอน = 75°

  // --- รางซ้าย-ขวา (เอียง 75° จากแนวนอน) ---
  const railGeo = new THREE.BoxGeometry(CFG.ladder.railSize, ladderLength, CFG.ladder.railSize);

  const railLeft = new THREE.Mesh(railGeo, matLadderRail);
  railLeft.position.set(horizontalDist / 2, totalVertical / 2, -halfWidth);
  railLeft.rotation.z = -(Math.PI / 2 - railAngle); // เอียงจากแนวตั้ง
  group.add(railLeft);

  const railRight = new THREE.Mesh(railGeo, matLadderRail);
  railRight.position.set(horizontalDist / 2, totalVertical / 2, halfWidth);
  railRight.rotation.z = -(Math.PI / 2 - railAngle);
  group.add(railRight);

  // --- ขั้นบันได (แนวนอน ตามแกน Z) ทุก 300mm ---
  const numRungs = Math.floor(verticalHeight / CFG.ladder.rungSpacing);
  const rungGeo = new THREE.CylinderGeometry(
    CFG.ladder.rungDia / 2, CFG.ladder.rungDia / 2, CFG.ladder.width, 8
  );
  rungGeo.rotateX(Math.PI / 2); // หมุนให้วางตามแกน Z

  for (let i = 1; i <= numRungs; i++) {
    const rungY = i * CFG.ladder.rungSpacing;
    const t = rungY / totalVertical;
    const rungX = t * horizontalDist;
    const rung = new THREE.Mesh(rungGeo, matLadderRung);
    rung.position.set(rungX, rungY, 0);
    group.add(rung);
  }

  return setGroupComponent(group, 'ladder');
}

/**
 * แคลมป์ (Coupler) — โมเดลสมจริง
 * มีครึ่งวงแคลมป์ 2 ชิ้นประกบท่อ + connecting body + น็อต-โบลท์
 * @param {'fixed'|'swivel'} type ชนิดแคลมป์
 */
export function createCoupler(type = 'fixed') {
  const mat = type === 'fixed' ? matCouplerF : matCouplerS;
  const group = new THREE.Group();

  const tubeR = CFG.tube.radius;       // 0.02415m — รัศมีท่อ
  const bandInnerR = tubeR + 0.002;    // รัศมีด้านในของแถบแคลมป์
  const bandThick = 0.005;             // ความหนาแถบ
  const arcAngle = Math.PI * 1.35;     // ~243° arc (เว้นช่องน็อต)

  // --- Shared Geometries (สร้างครั้งเดียว) ---
  const bandGeo = new THREE.TorusGeometry(bandInnerR, bandThick, 6, 14, arcAngle);
  const boltGeo = new THREE.CylinderGeometry(0.0025, 0.0025, 0.02, 6);
  const nutGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.004, 6);

  if (type === 'fixed') {
    // ============================================================
    // RIGHT-ANGLE COUPLER (แคลมป์ตาย) — 2 แถบตั้งฉาก 90°
    // ============================================================

    // แถบที่ 1: ประกบรอบท่อแนวตั้ง (Standard)
    // วางราบ (horizontal ring) รอบแกน Y
    const band1 = new THREE.Mesh(bandGeo, mat);
    band1.rotation.x = Math.PI / 2;    // วางราบ
    band1.rotation.z = Math.PI * 0.8;  // หมุนให้ช่องน็อตหันออกด้านหน้า
    group.add(band1);

    // แถบที่ 2: ประกบรอบท่อแนวนอน (Ledger/Transom)
    // วางตั้ง (vertical ring) รอบแกน X — ตั้งฉากกับแถบ 1
    const band2 = new THREE.Mesh(bandGeo, mat);
    band2.rotation.z = Math.PI / 2;
    band2.rotation.x = Math.PI * 0.8;
    group.add(band2);

    // Connecting Body — บล็อกเชื่อมกลาง
    const bodyGeo = new THREE.BoxGeometry(0.022, 0.022, 0.016);
    const body = new THREE.Mesh(bodyGeo, mat);
    group.add(body);

    // น็อต-โบลท์ แถบที่ 1 (ยื่นออกด้านหน้า +Z)
    const bolt1 = new THREE.Mesh(boltGeo, matBolt);
    bolt1.rotation.x = Math.PI / 2;
    bolt1.position.set(0, 0, bandInnerR + 0.01);
    group.add(bolt1);
    const nut1 = new THREE.Mesh(nutGeo, matBolt);
    nut1.rotation.x = Math.PI / 2;
    nut1.position.set(0, 0, bandInnerR + 0.021);
    group.add(nut1);

    // น็อต-โบลท์ แถบที่ 2 (ยื่นออกด้านบน +Y)
    const bolt2 = new THREE.Mesh(boltGeo, matBolt);
    bolt2.position.set(0, bandInnerR + 0.01, 0);
    group.add(bolt2);
    const nut2 = new THREE.Mesh(nutGeo, matBolt);
    nut2.position.set(0, bandInnerR + 0.021, 0);
    group.add(nut2);

  } else {
    // ============================================================
    // SWIVEL COUPLER (แคลมป์เป็น) — 2 แถบ + จุดหมุน (pivot)
    // ============================================================

    // แถบที่ 1: ประกบรอบท่อแนวตั้ง
    const band1 = new THREE.Mesh(bandGeo, mat);
    band1.rotation.x = Math.PI / 2;
    band1.rotation.z = Math.PI * 0.8;
    band1.position.y = 0.005; // เลื่อนขึ้นเล็กน้อย
    group.add(band1);

    // แถบที่ 2: ประกบรอบท่อที่มุมใดก็ได้ (แสดงเอียง ~45° จากแถบ 1)
    const band2 = new THREE.Mesh(bandGeo, mat);
    band2.rotation.set(Math.PI * 0.35, Math.PI * 0.25, Math.PI / 2);
    band2.position.y = -0.005;
    group.add(band2);

    // Swivel Pin — แกนหมุนเชื่อมต่อ 2 แถบ
    const pinGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.025, 8);
    const pin = new THREE.Mesh(pinGeo, matBolt);
    group.add(pin);

    // Swivel Body — ตัวเรือนจุดหมุน (ทรงกระบอกเล็ก)
    const swivelBodyGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.015, 8);
    const swivelBody = new THREE.Mesh(swivelBodyGeo, mat);
    group.add(swivelBody);

    // น็อต-โบลท์ แถบที่ 1
    const bolt1 = new THREE.Mesh(boltGeo, matBolt);
    bolt1.rotation.x = Math.PI / 2;
    bolt1.position.set(0, 0.005, bandInnerR + 0.01);
    group.add(bolt1);
    const nut1 = new THREE.Mesh(nutGeo, matBolt);
    nut1.rotation.x = Math.PI / 2;
    nut1.position.set(0, 0.005, bandInnerR + 0.021);
    group.add(nut1);

    // น็อต-โบลท์ แถบที่ 2
    const bolt2 = new THREE.Mesh(boltGeo, matBolt);
    bolt2.position.set(bandInnerR + 0.01, -0.005, 0);
    bolt2.rotation.z = Math.PI / 2;
    group.add(bolt2);
    const nut2 = new THREE.Mesh(nutGeo, matBolt);
    nut2.position.set(bandInnerR + 0.021, -0.005, 0);
    nut2.rotation.z = Math.PI / 2;
    group.add(nut2);
  }

  return setGroupComponent(group, type === 'fixed' ? 'couplerFixed' : 'couplerSwivel');
}

/**
 * ป้ายสถานะ (Scaffold Tag)
 * @param {'green'|'yellow'|'red'} color สีป้าย
 */
export function createTag(color = 'green') {
  const group = new THREE.Group();

  // แผ่นป้าย
  const tagGeo = new THREE.PlaneGeometry(CFG.tag.width, CFG.tag.height);
  const tagMat = new THREE.MeshBasicMaterial({
    color: COLORS.tag[color],
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  const tagMesh = new THREE.Mesh(tagGeo, tagMat);
  group.add(tagMesh);

  // ขอบป้าย
  const edgeGeo = new THREE.EdgesGeometry(tagGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
  const edge = new THREE.LineSegments(edgeGeo, edgeMat);
  group.add(edge);

  // เก็บ reference ของ tagMesh material เพื่อเปลี่ยนสีภายหลัง
  group.userData = { componentId: 'tag', tagMaterial: tagMat };

  group.traverse((child) => {
    if (child.isMesh) {
      child.userData = { componentId: 'tag' };
    }
  });

  return group;
}
