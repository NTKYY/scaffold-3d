// ============================================================
// scaffold-builder.js — ฟังก์ชันประกอบนั่งร้าน 3 Bay × 4 Lift
// สร้างชิ้นส่วนทั้งหมดและจัดวางตามตำแหน่งที่ถูกต้อง
// พร้อมแคลมป์ตาย/เป็นที่ทุกจุดต่อ
// ============================================================

import * as THREE from 'three';
import { SCAFFOLD_CONFIG as CFG } from './specs-data.js';
import {
  createStandard, createLedger, createTransom, createBracing,
  createBasePlate, createSoleBoard, createPlank,
  createGuardRail, createToeBoard, createLadder,
  createCoupler, createTag,
} from './components.js';

// --- Module-level reference สำหรับ tag mesh ---
let _tagGroup = null;

/**
 * สร้างนั่งร้านทั้งหมด
 * @returns {THREE.Group} กลุ่มชิ้นส่วนนั่งร้านทั้งหมด
 */
export function buildScaffold() {
  const scaffold = new THREE.Group();
  scaffold.name = 'scaffold';

  const { bayLength, liftHeight, scaffoldWidth, numBays, numLifts } = CFG;
  const totalLength = numBays * bayLength;   // 6.0 m
  const totalHeight = numLifts * liftHeight;  // 8.0 m
  const baseY = CFG.soleBoard.thickness + CFG.basePlate.thickness; // Y offset ฐาน

  // ตำแหน่งเสาตั้งตามแกน X (0, 2, 4, 6)
  const xPos = [];
  for (let i = 0; i <= numBays; i++) xPos.push(i * bayLength);

  // ตำแหน่งเสาตั้งตามแกน Z (แถวหน้า=0, แถวหลัง=scaffoldWidth)
  const zPos = [0, scaffoldWidth];

  // ระดับความสูง (0, 2, 4, 6, 8) — relative to base
  const levels = [];
  for (let i = 0; i <= numLifts; i++) levels.push(i * liftHeight);

  // ====================================================================
  // 1. SOLE BOARDS (ไม้รองฐาน)
  // ====================================================================
  zPos.forEach((z) => {
    const board = createSoleBoard(totalLength + 0.3);
    board.position.set(totalLength / 2, CFG.soleBoard.thickness / 2, z);
    scaffold.add(board);
  });

  // ====================================================================
  // 2. BASE PLATES (ฐานรองตีนเสา)
  // ====================================================================
  xPos.forEach((x) => {
    zPos.forEach((z) => {
      const plate = createBasePlate();
      plate.position.set(x, CFG.soleBoard.thickness + CFG.basePlate.thickness / 2, z);
      scaffold.add(plate);
    });
  });

  // ====================================================================
  // 3. STANDARDS (เสาตั้ง) — 8 ต้น
  //    สูง = totalHeight + ราวกันตกบน (1.0m) เพื่อรองรับราวกันตกชั้นบนสุด
  // ====================================================================
  const standardHeight = totalHeight + CFG.guardRail.topHeight; // 8 + 1 = 9m
  xPos.forEach((x) => {
    zPos.forEach((z) => {
      const std = createStandard(standardHeight);
      std.position.set(x, baseY + standardHeight / 2, z);
      scaffold.add(std);
    });
  });

  // ====================================================================
  // 4. LEDGERS (ตงยาว — แนว X) + แคลมป์ตายทุกจุดต่อ
  // ====================================================================
  levels.forEach((level) => {
    const y = baseY + level;
    for (let bay = 0; bay < numBays; bay++) {
      const xCenter = bay * bayLength + bayLength / 2;
      zPos.forEach((z) => {
        const ledger = createLedger(bayLength);
        ledger.position.set(xCenter, y, z);
        scaffold.add(ledger);

        // แคลมป์ตายที่ปลายทั้งสองข้างของ ledger (ตรงเสาตั้ง)
        const cLeft = createCoupler('fixed');
        cLeft.position.set(bay * bayLength, y, z);
        scaffold.add(cLeft);

        const cRight = createCoupler('fixed');
        cRight.position.set((bay + 1) * bayLength, y, z);
        scaffold.add(cRight);
      });
    }
  });

  // ====================================================================
  // 5. TRANSOMS (ตงขวาง — แนว Z) + แคลมป์ตายทุกจุดต่อ
  // ====================================================================
  levels.forEach((level) => {
    const y = baseY + level;
    xPos.forEach((x) => {
      const transom = createTransom(scaffoldWidth);
      transom.position.set(x, y, scaffoldWidth / 2);
      scaffold.add(transom);

      // แคลมป์ตายที่ปลายทั้งสองข้างของ transom (ตรงเสาตั้ง)
      zPos.forEach((z) => {
        const c = createCoupler('fixed');
        c.position.set(x, y, z);
        scaffold.add(c);
      });
    });
  });

  // ====================================================================
  // 6. DIAGONAL BRACING (ทะแยง) + แคลมป์เป็นทุกจุดต่อ
  // ====================================================================
  const bracingLen = Math.sqrt(bayLength * bayLength + liftHeight * liftHeight);
  const bracingAngle = Math.atan2(liftHeight, bayLength);
  const bracingSideLen = Math.sqrt(scaffoldWidth * scaffoldWidth + liftHeight * liftHeight);
  const bracingSideAngle = Math.atan2(liftHeight, scaffoldWidth);

  // --- ด้านหน้า (z=0) และด้านหลัง (z=scaffoldWidth) ---
  [0, scaffoldWidth].forEach((z) => {
    for (let bay = 0; bay < numBays; bay++) {
      for (let lift = 0; lift < numLifts; lift++) {
        const bracing = createBracing(bracingLen);
        const xStart = bay * bayLength;
        const yBottom = baseY + lift * liftHeight;
        const xCenter = xStart + bayLength / 2;
        const yCenter = yBottom + liftHeight / 2;

        bracing.position.set(xCenter, yCenter, z);

        // สลับทิศทาง
        const dir = (bay + lift) % 2 === 0 ? 1 : -1;
        bracing.rotation.z = dir * (Math.PI / 2 - bracingAngle);
        scaffold.add(bracing);

        // แคลมป์เป็นที่ปลายทั้งสองข้าง
        const x1 = dir === 1 ? xStart : xStart + bayLength;
        const y1 = yBottom;
        const x2 = dir === 1 ? xStart + bayLength : xStart;
        const y2 = yBottom + liftHeight;

        const sc1 = createCoupler('swivel');
        sc1.position.set(x1, y1, z);
        scaffold.add(sc1);

        const sc2 = createCoupler('swivel');
        sc2.position.set(x2, y2, z);
        scaffold.add(sc2);
      }
    }
  });

  // --- ด้านข้าง (x=0 และ x=totalLength) ---
  [0, totalLength].forEach((x) => {
    for (let lift = 0; lift < numLifts; lift++) {
      const bracing = createBracing(bracingSideLen);
      const yBottom = baseY + lift * liftHeight;
      const yCenter = yBottom + liftHeight / 2;
      const zCenter = scaffoldWidth / 2;

      bracing.position.set(x, yCenter, zCenter);

      const dir = lift % 2 === 0 ? 1 : -1;
      bracing.rotation.x = dir * (Math.PI / 2 - bracingSideAngle);
      scaffold.add(bracing);

      // แคลมป์เป็นที่ปลายทั้งสอง
      const z1 = dir === 1 ? 0 : scaffoldWidth;
      const z2 = dir === 1 ? scaffoldWidth : 0;

      const sc1 = createCoupler('swivel');
      sc1.position.set(x, yBottom, z1);
      scaffold.add(sc1);

      const sc2 = createCoupler('swivel');
      sc2.position.set(x, yBottom + liftHeight, z2);
      scaffold.add(sc2);
    }
  });

  // ====================================================================
  // 7. PLATFORM PLANKS (แผ่นปูพื้น)
  //    แผ่นวางตามยาว bay (แกน X), เรียงกันตามความกว้าง (แกน Z)
  //    5 แผ่น × 225mm ≈ 1.125m → เต็มความกว้าง 1.2m
  // ====================================================================
  const planksPerBay = 5;
  const plankStep = CFG.plank.width + CFG.plank.gap; // 0.23m

  for (let lift = 1; lift <= numLifts; lift++) {
    const y = baseY + lift * liftHeight;
    // Staggered hatch: ชั้นคู่ (1,3) เปิดช่องฝั่งหน้า, ชั้นคี่ (2,4) เปิดฝั่งหลัง
    const isHatchFront = lift % 2 === 1;

    for (let bay = 0; bay < numBays; bay++) {
      const xCenter = bay * bayLength + bayLength / 2;

      for (let p = 0; p < planksPerBay; p++) {
        // ช่อง hatch สำหรับบันได — bay 0 เท่านั้น (ยกเว้นชั้นบนสุด)
        if (bay === 0 && lift < numLifts) {
          if (isHatchFront && p < 2) continue;   // เปิดช่องฝั่งหน้า (p=0,1)
          if (!isHatchFront && p >= 3) continue;  // เปิดช่องฝั่งหลัง (p=3,4)
        }

        const plank = createPlank(bayLength - 0.02);
        const zPlank = p * plankStep + CFG.plank.width / 2 + 0.02;
        plank.position.set(xCenter, y + CFG.plank.thickness / 2, zPlank);
        scaffold.add(plank);
      }
    }
  }

  // ====================================================================
  // 8. GUARD RAILS (ราวกันตก) + แคลมป์ตายทุกจุดต่อ
  // ====================================================================
  for (let lift = 1; lift <= numLifts; lift++) {
    const platformY = baseY + lift * liftHeight;
    const topY = platformY + CFG.guardRail.topHeight;
    const midY = platformY + CFG.guardRail.midHeight;

    // --- ด้านหน้า (z=0) และด้านหลัง (z=scaffoldWidth) — แนว X ---
    [0, scaffoldWidth].forEach((z) => {
      for (let bay = 0; bay < numBays; bay++) {
        const xCenter = bay * bayLength + bayLength / 2;

        const topRail = createGuardRail(bayLength, true, 'x');
        topRail.position.set(xCenter, topY, z);
        scaffold.add(topRail);

        const midRail = createGuardRail(bayLength, false, 'x');
        midRail.position.set(xCenter, midY, z);
        scaffold.add(midRail);

        // แคลมป์ตายที่ปลายราวกันตก (ตรงเสาตั้ง)
        [bay * bayLength, (bay + 1) * bayLength].forEach((cx) => {
          [topY, midY].forEach((cy) => {
            const c = createCoupler('fixed');
            c.position.set(cx, cy, z);
            scaffold.add(c);
          });
        });
      }
    });

    // --- ด้านข้าง (x=0 และ x=totalLength) — แนว Z ---
    [0, totalLength].forEach((x) => {
      const topRailSide = createGuardRail(scaffoldWidth, true, 'z');
      topRailSide.position.set(x, topY, scaffoldWidth / 2);
      scaffold.add(topRailSide);

      const midRailSide = createGuardRail(scaffoldWidth, false, 'z');
      midRailSide.position.set(x, midY, scaffoldWidth / 2);
      scaffold.add(midRailSide);

      // แคลมป์ตายที่ปลายราวด้านข้าง
      zPos.forEach((cz) => {
        [topY, midY].forEach((cy) => {
          const c = createCoupler('fixed');
          c.position.set(x, cy, cz);
          scaffold.add(c);
        });
      });
    });
  }

  // ====================================================================
  // 9. TOE BOARDS (แผ่นกันของตก)
  // ====================================================================
  for (let lift = 1; lift <= numLifts; lift++) {
    const platformY = baseY + lift * liftHeight;
    const tbY = platformY + CFG.toeBoard.height / 2;

    // ด้านหน้า/หลัง
    [0, scaffoldWidth].forEach((z) => {
      for (let bay = 0; bay < numBays; bay++) {
        const xCenter = bay * bayLength + bayLength / 2;
        const zOff = z === 0 ? -CFG.toeBoard.thickness / 2 : CFG.toeBoard.thickness / 2;
        const tb = createToeBoard(bayLength, 'x');
        tb.position.set(xCenter, tbY, z + zOff);
        scaffold.add(tb);
      }
    });

    // ด้านข้าง
    [0, totalLength].forEach((x) => {
      const xOff = x === 0 ? -CFG.toeBoard.thickness / 2 : CFG.toeBoard.thickness / 2;
      const tb = createToeBoard(scaffoldWidth, 'z');
      tb.position.set(x + xOff, tbY, scaffoldWidth / 2);
      scaffold.add(tb);
    });
  }

  // ====================================================================
  // 10. LADDER BAY (บันไดภายในนั่งร้าน — Bay 0)
  //     Internal Ladder Bay: บันไดอยู่ภายใน bay 0
  //     มุมเอียง ~75° (4:1 ratio) ตามมาตรฐานสากล
  //     Staggered: สลับทิศซ้าย-ขวา + หน้า-หลัง ทุกชั้น
  //     คนปีนขึ้นชั้นหนึ่ง → เดินข้ามพื้นชาน → ปีนบันไดทิศตรงข้าม
  // ====================================================================
  const ladderAngleRad = 75 * Math.PI / 180;
  const totalVert = liftHeight + 1.0; // ยื่นเหนือพื้นชาน 1m
  const hDist = totalVert / Math.tan(ladderAngleRad); // ~0.8m

  for (let lift = 0; lift < numLifts; lift++) {
    const ladderBaseY = baseY + lift * liftHeight;
    const ladder = createLadder(liftHeight);

    const isEvenLift = lift % 2 === 0;

    // --- สลับทิศซ้าย-ขวา (X direction) ---
    // ชั้นคู่ (0,2): บันไดเอนไปทางซ้าย (ฐานอยู่ขวา ยอดอยู่ซ้ายของ bay)
    // ชั้นคี่ (1,3): บันไดเอนไปทางขวา (ฐานอยู่ซ้าย ยอดอยู่ขวาของ bay)
    if (isEvenLift) {
      ladder.rotation.y = Math.PI; // หันกลับ: ฐาน→ขวา, ยอด→ซ้าย
      ladder.position.x = hDist + 0.15;
    } else {
      ladder.rotation.y = 0; // ปกติ: ฐาน→ซ้าย, ยอด→ขวา
      ladder.position.x = bayLength - hDist - 0.15;
    }

    // --- สลับตำแหน่งหน้า-หลัง (Z direction) ---
    ladder.position.z = isEvenLift
      ? scaffoldWidth * 0.25  // ชั้นคู่: ฝั่งหน้า
      : scaffoldWidth * 0.75; // ชั้นคี่: ฝั่งหลัง

    ladder.position.y = ladderBaseY;

    scaffold.add(ladder);
  }

  // ====================================================================
  // 11. SCAFFOLD TAG (ป้ายสถานะ) — ติดที่ทางขึ้น bay 0 ระดับสายตา
  // ====================================================================
  _tagGroup = createTag('green');
  // ติดที่ขอบ bay 0 ด้านหน้า ระดับสายตา (~1.5m)
  _tagGroup.position.set(bayLength / 2, baseY + 1.5, -0.15);
  _tagGroup.rotation.y = 0; // หันออกด้านหน้า
  scaffold.add(_tagGroup);

  // ====================================================================
  // จัดกึ่งกลางนั่งร้านตาม X, Z (ให้หมุนรอบจุดศูนย์กลาง)
  // ====================================================================
  const box = new THREE.Box3().setFromObject(scaffold);
  const center = box.getCenter(new THREE.Vector3());
  scaffold.position.x = -center.x;
  scaffold.position.z = -center.z;

  return scaffold;
}

/**
 * คืน reference ของ Tag mesh เพื่อเปลี่ยนสี
 */
export function getTagMesh() {
  return _tagGroup;
}
