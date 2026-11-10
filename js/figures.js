import * as THREE from 'three';
import { POSE_KEYS } from './config.js';

function makeMaterial(color, extras = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.62,
    metalness: 0.04,
    ...extras
  });
}

function mesh(geometry, material, extras = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true;
  m.receiveShadow = true;
  Object.assign(m.userData, extras);
  return m;
}

function addLimb(parent, radius, length, material) {
  const cyl = mesh(new THREE.CylinderGeometry(radius, radius * 0.9, length, 11), material);
  cyl.position.y = -length / 2;
  parent.add(cyl);
  parent.add(mesh(new THREE.SphereGeometry(radius, 11, 9), material));
  const end = mesh(new THREE.SphereGeometry(radius * 0.9, 11, 9), material);
  end.position.y = -length;
  parent.add(end);
}

function resetJoints(joints, inner, poseOffset) {
  Object.values(joints).forEach((joint) => joint.rotation.set(0, 0, 0));
  inner.rotation.set(0, 0, 0);
  poseOffset.position.set(0, 0, 0);
}

function deg(joint, x = 0, y = 0, z = 0) {
  joint.rotation.set(THREE.MathUtils.degToRad(x), THREE.MathUtils.degToRad(y), THREE.MathUtils.degToRad(z));
}

export function applyPoseToParts(joints, inner, poseOffset, name) {
  resetJoints(joints, inner, poseOffset);
  const pose = POSE_KEYS.includes(name) ? name : 'stehen';

  if (pose === 'stehen') {
    deg(joints.lUpperArm, 6, 0, 14);
    deg(joints.rUpperArm, 6, 0, -14);
  } else if (pose === 'gehen') {
    deg(joints.lUpperLeg, -34, 0, 2);
    deg(joints.lLowerLeg, 22, 0, 0);
    deg(joints.rUpperLeg, 24, 0, -2);
    deg(joints.rLowerLeg, 10, 0, 0);
    deg(joints.lUpperArm, 26, 0, 12);
    deg(joints.lLowerArm, -18, 0, 0);
    deg(joints.rUpperArm, -32, 0, -12);
    deg(joints.rLowerArm, -20, 0, 0);
    deg(joints.spine, 5, -8, 0);
    deg(joints.head, -4, 10, 0);
  } else if (pose === 'sitzen') {
    deg(joints.lUpperLeg, -86, 0, 5);
    deg(joints.rUpperLeg, -86, 0, -5);
    deg(joints.lLowerLeg, 80, 0, 0);
    deg(joints.rLowerLeg, 80, 0, 0);
    deg(joints.lUpperArm, 14, 0, 20);
    deg(joints.rUpperArm, 14, 0, -20);
    deg(joints.spine, 8, 0, 0);
    poseOffset.position.y = -0.48;
  } else if (pose === 'zeigen') {
    deg(joints.lUpperArm, 8, 0, 14);
    deg(joints.rUpperArm, -82, -16, -6);
    deg(joints.rLowerArm, -8, 0, 0);
    deg(joints.head, 0, -18, 0);
    deg(joints.spine, 0, -12, 0);
  } else if (pose === 'kniend') {
    deg(joints.rUpperLeg, 12, 0, 6);
    deg(joints.rLowerLeg, 145, 0, 0);
    deg(joints.lUpperLeg, -74, 0, -4);
    deg(joints.lLowerLeg, 78, 0, 0);
    deg(joints.spine, 10, 0, 0);
    deg(joints.lUpperArm, 12, 0, 18);
    deg(joints.rUpperArm, 16, 0, -22);
    poseOffset.position.y = -0.5;
  } else if (pose === 'liegend') {
    deg(joints.lUpperArm, -16, 0, 42);
    deg(joints.rUpperArm, -22, 0, -38);
    deg(joints.lUpperLeg, -10, 0, 6);
    deg(joints.rUpperLeg, 8, 0, -6);
    deg(joints.lLowerLeg, 16, 0, 0);
    deg(joints.rLowerLeg, 8, 0, 0);
    inner.rotation.x = THREE.MathUtils.degToRad(-90);
    poseOffset.position.y = 0.16;
  }

  return pose;
}

export function createFigure(clothingColor = '#3d5a80') {
  const root = new THREE.Group();
  const inner = new THREE.Group();
  const poseOffset = new THREE.Group();
  root.add(inner);
  inner.add(poseOffset);

  const skinMat = makeMaterial('#d1a278');
  const clothMat = makeMaterial(clothingColor);
  const shoeMat = makeMaterial('#2a241c');

  const joints = {};
  const hip = new THREE.Group();
  hip.position.y = 0.94;
  poseOffset.add(hip);
  joints.hip = hip;

  const pelvis = mesh(new THREE.BoxGeometry(0.3, 0.14, 0.18), clothMat, { recolor: true });
  hip.add(pelvis);

  const spine = new THREE.Group();
  spine.position.y = 0.07;
  hip.add(spine);
  joints.spine = spine;

  const torso = mesh(new THREE.BoxGeometry(0.34, 0.52, 0.2), clothMat, { recolor: true });
  torso.position.y = 0.28;
  spine.add(torso);

  const neck = new THREE.Group();
  neck.position.y = 0.54;
  spine.add(neck);
  joints.neck = neck;
  const neckMesh = mesh(new THREE.CylinderGeometry(0.05, 0.062, 0.08, 10), skinMat);
  neckMesh.position.y = 0.04;
  neck.add(neckMesh);

  const head = new THREE.Group();
  head.position.y = 0.08;
  neck.add(head);
  joints.head = head;
  const headMesh = mesh(new THREE.SphereGeometry(0.115, 16, 13), skinMat);
  headMesh.position.y = 0.115;
  head.add(headMesh);

  function makeArm(side) {
    const prefix = side < 0 ? 'l' : 'r';
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.2, 0.5, 0);
    spine.add(shoulder);

    const upper = new THREE.Group();
    shoulder.add(upper);
    joints[`${prefix}UpperArm`] = upper;
    addLimb(upper, 0.045, 0.28, skinMat);

    const lower = new THREE.Group();
    lower.position.y = -0.28;
    upper.add(lower);
    joints[`${prefix}LowerArm`] = lower;
    addLimb(lower, 0.038, 0.25, skinMat);

    const hand = new THREE.Group();
    hand.position.y = -0.25;
    lower.add(hand);
    joints[`${prefix}Hand`] = hand;
    const handMesh = mesh(new THREE.SphereGeometry(0.042, 10, 8), skinMat);
    handMesh.position.y = -0.042;
    hand.add(handMesh);
  }

  function makeLeg(side) {
    const prefix = side < 0 ? 'l' : 'r';
    const socket = new THREE.Group();
    socket.position.set(side * 0.1, -0.07, 0);
    hip.add(socket);

    const upper = new THREE.Group();
    socket.add(upper);
    joints[`${prefix}UpperLeg`] = upper;
    addLimb(upper, 0.06, 0.42, skinMat);

    const lower = new THREE.Group();
    lower.position.y = -0.42;
    upper.add(lower);
    joints[`${prefix}LowerLeg`] = lower;
    addLimb(lower, 0.048, 0.4, skinMat);

    const foot = new THREE.Group();
    foot.position.y = -0.4;
    lower.add(foot);
    joints[`${prefix}Foot`] = foot;
    const footMesh = mesh(new THREE.BoxGeometry(0.1, 0.065, 0.24), shoeMat);
    footMesh.position.set(0, -0.032, -0.05);
    foot.add(footMesh);
  }

  makeArm(-1);
  makeArm(1);
  makeLeg(-1);
  makeLeg(1);

  applyPoseToParts(joints, inner, poseOffset, 'stehen');

  root.userData.kind = 'figure';
  return { root, joints, inner, poseOffset, clothMat, skinMat };
}

export function readJointDegrees(joints) {
  const data = {};
  Object.entries(joints).forEach(([name, joint]) => {
    data[name] = [
      THREE.MathUtils.radToDeg(joint.rotation.x),
      THREE.MathUtils.radToDeg(joint.rotation.y),
      THREE.MathUtils.radToDeg(joint.rotation.z)
    ];
  });
  return data;
}

export function writeJointDegrees(joints, data = {}) {
  Object.entries(data).forEach(([name, xyz]) => {
    const joint = joints[name];
    if (!joint || !xyz) return;
    joint.rotation.set(
      THREE.MathUtils.degToRad(xyz[0] || 0),
      THREE.MathUtils.degToRad(xyz[1] || 0),
      THREE.MathUtils.degToRad(xyz[2] || 0)
    );
  });
}

export function findJointName(object, joints) {
  let current = object;
  while (current) {
    for (const [name, joint] of Object.entries(joints)) {
      if (joint === current) return name;
    }
    current = current.parent;
  }
  return null;
}
