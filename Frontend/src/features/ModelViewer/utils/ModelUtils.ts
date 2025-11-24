import * as THREE from "three";
const pointSlotHelperMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000,
  transparent: true,
  opacity: 1,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const areaSlotHelperMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 1,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});
const lineSlotHelperMaterial = new THREE.MeshBasicMaterial({
  color: 0x0000ff,
  transparent: true,
  opacity: 1,
  side: THREE.DoubleSide,
  depthWrite: true,
  polygonOffset: true,
  polygonOffsetFactor: -1,
  polygonOffsetUnits: -1,
});

const _targetWorldPos = new THREE.Vector3();
const _targetWorldQuat = new THREE.Quaternion();
const _inverseTargetQuat = new THREE.Quaternion();
const _localPoint = new THREE.Vector3();

type Slot = {
  type: "ModelPointSlot" | "ModelLineSlot" | "ModelAreaSlot";
  directionVector: { x: number; y: number; z: number };
};

type SlotContext = {
  slot: Slot;
  localGeomBox: THREE.Box3;
  componentSize: THREE.Vector3;
  boxCenter: THREE.Vector3;
  helperThickness: number;
  targetSize: number;
  justifications: ReturnType<typeof getJustifications>;
  targetVec: THREE.Vector3;
};

export function isMesh(object: THREE.Object3D): object is THREE.Mesh {
  return (object as THREE.Mesh).isMesh;
}
export function cloneNodeMaterials(node: THREE.Object3D) {
  if (isMesh(node)) {
    if (Array.isArray(node.material)) {
      node.material = node.material.map((m) => m.clone());
    } else {
      node.material = node.material.clone();
    }
  }
}

function getLocalBoundingBox(node: THREE.Object3D): THREE.Box3 {
  const localGeomBox = new THREE.Box3();

  if (isMesh(node) && node.geometry) {
    if (!node.geometry.boundingBox) node.geometry.computeBoundingBox();
    if (node.geometry.boundingBox) {
      localGeomBox.copy(node.geometry.boundingBox);
    }
  } else {
    node.traverse((child) => {
      if (isMesh(child) && child.geometry) {
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        if (child.geometry.boundingBox) {
          const childBox = child.geometry.boundingBox.clone();
          childBox.applyMatrix4(child.matrixWorld);
          localGeomBox.union(childBox);
        }
      }
    });

    if (!localGeomBox.isEmpty()) {
      const invWorldMatrix = node.matrixWorld.clone().invert();
      localGeomBox.applyMatrix4(invWorldMatrix);
    }
  }
  return localGeomBox;
}

function getJustifications(mountingDesc: {
  justificationOnPointSlots: { x: number; y: number; z: number };
  justificationOnLineSlot: { y: number; z: number };
  justificationOnAreaSlots: number;
}) {
  const justPoint = mountingDesc?.justificationOnPointSlots || {
    x: 0,
    y: 0,
    z: 0,
  };
  const justLine = mountingDesc?.justificationOnLineSlot
    ? { x: 0, ...mountingDesc.justificationOnLineSlot }
    : { x: 0, y: 0, z: 0 };
  const justAreaRaw = mountingDesc?.justificationOnAreaSlots;
  const justArea =
    typeof justAreaRaw === "object" && justAreaRaw !== null
      ? justAreaRaw
      : { x: 0, y: 0, z: 0 };

  return {
    point: justPoint,
    line: justLine,
    area: justArea,
    pointIsJustified:
      justPoint.x !== 0 || justPoint.y !== 0 || justPoint.z !== 0,
    lineIsJustified: justLine.x !== 0 || justLine.y !== 0 || justLine.z !== 0,
    areaIsJustified: justArea.x !== 0 || justArea.y !== 0 || justArea.z !== 0,
  };
}

function getHelperThickness(
  box: THREE.Box3,
  size: THREE.Vector3,
  targetSize: number,
): number {
  let thickness;
  if (box.isEmpty()) {
    thickness = 0.01 * targetSize;
  } else {
    thickness = Math.max(size.x, size.y, size.z) * 0.01;
    if (thickness === 0) thickness = 0.01 * targetSize;
  }
  return thickness;
}

function createAreaSlot(context: SlotContext): THREE.Mesh {
  const { componentSize, helperThickness, targetSize, slot } = context;
  const { x, y, z } = slot.directionVector;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);

  let areaW: number, areaH: number;
  if (context.localGeomBox.isEmpty()) {
    areaW = 0.1 * targetSize;
    areaH = 0.1 * targetSize;
  } else if (absX > absY && absX > absZ) {
    areaW = componentSize.y;
    areaH = componentSize.z;
  } else if (absY > absX && absY > absZ) {
    areaW = componentSize.x;
    areaH = componentSize.z;
  } else {
    areaW = componentSize.x;
    areaH = componentSize.y;
  }

  if (areaW === 0)
    areaW = Math.max(
      0.1 * targetSize,
      componentSize.x,
      componentSize.y,
      componentSize.z,
    );
  if (areaH === 0)
    areaH = Math.max(
      0.1 * targetSize,
      componentSize.x,
      componentSize.y,
      componentSize.z,
    );

  const geometry = new THREE.BoxGeometry(areaW, areaH, helperThickness);
  const mesh = new THREE.Mesh(geometry, areaSlotHelperMaterial);
  mesh.userData.slotDims = { width: areaW, height: areaH };
  return mesh;
}

function createLineSlot(context: SlotContext): THREE.Mesh {
  const { componentSize, helperThickness, targetSize, slot } = context;
  const { x, y, z } = slot.directionVector;
  const absX = Math.abs(x);
  const absY = Math.abs(y);
  const absZ = Math.abs(z);

  let lineLength;
  if (context.localGeomBox.isEmpty()) {
    lineLength = 0.5 * targetSize;
  } else if (absX > absY && absX > absZ) {
    lineLength = componentSize.x;
  } else if (absY > absX && absY > absZ) {
    lineLength = componentSize.y;
  } else {
    lineLength = componentSize.z;
  }
  if (lineLength === 0) lineLength = 0.5 * targetSize;

  const geometry = new THREE.BoxGeometry(
    lineLength,
    helperThickness,
    helperThickness / 2,
  );
  const mesh = new THREE.Mesh(geometry, lineSlotHelperMaterial);
  mesh.userData.slotDims = { length: lineLength };
  return mesh;
}

function createPointSlot(context: SlotContext): THREE.ArrowHelper {
  const { targetVec, targetSize } = context;

  const arrowLength = 60 * targetSize;
  const origin = new THREE.Vector3(0, 0, 0);

  const arrowHelper = new THREE.ArrowHelper(
    targetVec,
    origin,
    arrowLength,
    pointSlotHelperMaterial.color.getHex(),
    arrowLength * 0.5,
    arrowLength * 0.2,
  );

  (arrowHelper.line.material as THREE.MeshBasicMaterial).copy(
    pointSlotHelperMaterial,
  );
  (arrowHelper.cone.material as THREE.MeshBasicMaterial).copy(
    pointSlotHelperMaterial,
  );

  return arrowHelper;
}

function setSlotHelperPosition(
  slotHelperMesh: THREE.Object3D,
  context: SlotContext,
) {
  const { slot, justifications, boxCenter, componentSize, helperThickness } =
    context;
  const { x, y, z } = slot.directionVector;

  switch (slot.type) {
    case "ModelAreaSlot":
      if (justifications.areaIsJustified) {
        slotHelperMesh.position.set(
          justifications.area.x,
          justifications.area.y,
          justifications.area.z,
        );
      } else {
        slotHelperMesh.position.set(
          boxCenter.x + x * (componentSize.x / 2 + helperThickness / 2),
          boxCenter.y + y * (componentSize.y / 2 + helperThickness / 2),
          boxCenter.z + z * (componentSize.z / 2 + helperThickness / 2),
        );
      }
      break;

    case "ModelLineSlot":
      if (justifications.lineIsJustified) {
        slotHelperMesh.position.set(
          justifications.line.x,
          justifications.line.y,
          justifications.line.z,
        );
      } else {
        const lineThickness = helperThickness / 2;
        const absX = Math.abs(x);
        const absY = Math.abs(y);
        const absZ = Math.abs(z);
        if (absZ > absX && absZ > absY) {
          slotHelperMesh.position.set(
            boxCenter.x + componentSize.x / 2 + lineThickness / 2,
            boxCenter.y,
            boxCenter.z,
          );
        } else {
          slotHelperMesh.position.set(
            boxCenter.x,
            boxCenter.y,
            boxCenter.z + componentSize.z / 2 + lineThickness / 2,
          );
        }
      }
      break;

    case "ModelPointSlot":
      if (justifications.pointIsJustified) {
        slotHelperMesh.position.set(
          justifications.point.x,
          justifications.point.y,
          justifications.point.z,
        );
      } else {
        slotHelperMesh.position.set(
          boxCenter.x + (x * componentSize.x) / 2,
          boxCenter.y + (y * componentSize.y) / 2,
          boxCenter.z + (z * componentSize.z) / 2,
        );
      }
      break;
  }
}

function setSlotHelperOrientation(
  slotHelperMesh: THREE.Object3D,
  context: SlotContext,
) {
  const { slot, targetVec } = context;

  if (targetVec.lengthSq() < 0.0001) return;

  if (slot.type === "ModelAreaSlot") {
    const defaultNormal = new THREE.Vector3(0, 0, 1);
    slotHelperMesh.quaternion.setFromUnitVectors(defaultNormal, targetVec);
  } else if (slot.type === "ModelLineSlot") {
    const defaultDir = new THREE.Vector3(1, 0, 0);
    slotHelperMesh.quaternion.setFromUnitVectors(defaultDir, targetVec);
  }
}

export function processNodeSlots(
  node: THREE.Object3D,
  targetSize: number,
): void {
  if (!node.userData.Slots || !Array.isArray(node.userData.Slots)) {
    return;
  }

  const localGeomBox = getLocalBoundingBox(node);
  const componentSize = localGeomBox.getSize(new THREE.Vector3());
  node.userData.componentSize = componentSize;
  const boxCenter = localGeomBox.getCenter(new THREE.Vector3());
  const helperThickness = getHelperThickness(
    localGeomBox,
    componentSize,
    targetSize,
  );

  const mountingDesc = node.userData.MountingDescription;
  const justifications = getJustifications(mountingDesc);

  for (const slot of node.userData.Slots) {
    const { x, y, z } = slot.directionVector;
    const targetVec = new THREE.Vector3(x, y, z).normalize();

    const context: SlotContext = {
      slot,
      localGeomBox,
      componentSize,
      boxCenter,
      helperThickness,
      targetSize,
      justifications,
      targetVec,
    };

    let slotHelperMesh: THREE.Object3D | undefined;
    switch (slot.type) {
      case "ModelAreaSlot":
        slotHelperMesh = createAreaSlot(context);
        break;
      case "ModelLineSlot":
        slotHelperMesh = createLineSlot(context);
        break;
      case "ModelPointSlot":
        slotHelperMesh = createPointSlot(context);
        break;
    }

    if (slotHelperMesh) {
      slotHelperMesh.userData.slotType = slot.type;
      slotHelperMesh.userData.slotDirection = slot.directionVector;
      slotHelperMesh.userData.slotDescription = slot.description;
      slotHelperMesh.traverse((child) => {
        child.userData.isSlot = true;
        child.userData.slotType = slot.type;
        child.userData.slotDims = slotHelperMesh?.userData.slotDims;
        child.userData.slotDescription = slot.description;
      });
      setSlotHelperPosition(slotHelperMesh, context);
      setSlotHelperOrientation(slotHelperMesh, context);
      node.add(slotHelperMesh);
    }
  }
}

function getClosestPointOnAreaSlot(
  pointWorldPos: THREE.Vector3,
  areaSlot: THREE.Object3D,
  dims: { width: number; height: number },
): THREE.Vector3 {
  areaSlot.getWorldPosition(_targetWorldPos);
  areaSlot.getWorldQuaternion(_targetWorldQuat);

  _inverseTargetQuat.copy(_targetWorldQuat).invert();
  _localPoint
    .subVectors(pointWorldPos, _targetWorldPos)
    .applyQuaternion(_inverseTargetQuat);

  const halfW = dims.width / 2;
  const halfH = dims.height / 2;

  _localPoint.x = Math.max(-halfW, Math.min(halfW, _localPoint.x));
  _localPoint.y = Math.max(-halfH, Math.min(halfH, _localPoint.y));
  _localPoint.z = 0;

  _localPoint.applyQuaternion(_targetWorldQuat).add(_targetWorldPos);

  return _localPoint.clone();
}

function getClosestPointOnLineSlot(
  pointWorldPos: THREE.Vector3,
  lineSlot: THREE.Object3D,
  dims: { length: number },
): THREE.Vector3 {
  lineSlot.getWorldPosition(_targetWorldPos);
  lineSlot.getWorldQuaternion(_targetWorldQuat);

  _inverseTargetQuat.copy(_targetWorldQuat).invert();
  _localPoint
    .subVectors(pointWorldPos, _targetWorldPos)
    .applyQuaternion(_inverseTargetQuat);

  const halfL = dims.length / 2;
  _localPoint.x = Math.max(-halfL, Math.min(halfL, _localPoint.x));
  _localPoint.y = 0;
  _localPoint.z = 0;

  _localPoint.applyQuaternion(_targetWorldQuat).add(_targetWorldPos);

  return _localPoint.clone();
}

export function calculateSnap(
  movingObject: THREE.Object3D,
  scene: THREE.Group,
  ignoreList: THREE.Object3D[],
  snapThreshold: number = 0.5,
): THREE.Vector3 | null {
  const mountingDesc = movingObject.userData.MountingDescription;
  const allowedEntries: string[] = mountingDesc?.entries || [];

  if (allowedEntries.length === 0) return null;

  const movingSlots: { obj: THREE.Object3D; worldPos: THREE.Vector3 }[] = [];
  movingObject.traverse((child) => {
    if (child.userData.isSlot && child.userData.slotType === "ModelPointSlot") {
      if (child.parent?.userData.isSlot) return;
      const worldPos = new THREE.Vector3();
      child.getWorldPosition(worldPos);
      movingSlots.push({ obj: child, worldPos });
    }
  });

  if (movingSlots.length === 0) return null;

  let bestDelta: THREE.Vector3 | null = null;
  let minDistance = snapThreshold;

  scene.traverse((target) => {
    if (!target.visible || !target.userData.isSlot) return;
    if (target.parent?.userData.isSlot) return;

    const isSelf = ignoreList.some(
      (ignoredObj) =>
        ignoredObj === target || ignoredObj.getObjectById(target.id),
    );
    if (isSelf) return;

    if (!allowedEntries.includes(target.userData.slotDescription)) {
      return;
    }

    const tType = target.userData.slotType;
    const tDims = target.userData.slotDims;

    for (const mSlot of movingSlots) {
      let dist = Infinity;
      let closestPoint = new THREE.Vector3();

      if (tType === "ModelPointSlot") {
        target.getWorldPosition(_targetWorldPos);
        dist = mSlot.worldPos.distanceTo(_targetWorldPos);
        closestPoint.copy(_targetWorldPos);
      } else if (tType === "ModelLineSlot" && tDims) {
        closestPoint = getClosestPointOnLineSlot(mSlot.worldPos, target, tDims);
        dist = mSlot.worldPos.distanceTo(closestPoint);
      } else if (tType === "ModelAreaSlot" && tDims) {
        closestPoint = getClosestPointOnAreaSlot(mSlot.worldPos, target, tDims);
        dist = mSlot.worldPos.distanceTo(closestPoint);
      }

      if (dist < minDistance) {
        minDistance = dist;

        const snapDelta = new THREE.Vector3().subVectors(
          closestPoint,
          mSlot.worldPos,
        );

        const halfWidth = movingObject.userData.componentSize.x / 2;

        const startParams = new THREE.Vector3(0, 0, 0);
        startParams.applyMatrix4(movingObject.matrixWorld);

        const endParams = new THREE.Vector3(-halfWidth, 0, 0);
        endParams.applyMatrix4(movingObject.matrixWorld);

        const offsetVector = new THREE.Vector3().subVectors(
          endParams,
          startParams,
        );

        bestDelta = new THREE.Vector3().addVectors(snapDelta, offsetVector);
      }
    }
  });

  return bestDelta;
}

const _tempBox = new THREE.Box3();
const _childBox = new THREE.Box3();
const _movedBox = new THREE.Box3();

export function detectCollisions(
  movedObject: THREE.Object3D,
  scene: THREE.Group,
  ignoreList: THREE.Object3D[] = [],
  tolerance = -0.001,
): THREE.Object3D[] {
  const collisions: THREE.Object3D[] = [];

  _movedBox.setFromObject(movedObject);

  scene.traverse((child) => {
    if (!child.visible) return;
    if (child === movedObject) return;
    if (movedObject.getObjectById(child.id)) return;
    if (child.userData.isSlot) return;

    const isIgnored = ignoreList.some(
      (ignoredObj) =>
        ignoredObj === child || ignoredObj.getObjectById(child.id),
    );
    if (isIgnored) return;

    if (!isMesh(child)) return;

    _childBox.setFromObject(child);

    _tempBox.copy(_movedBox).expandByScalar(tolerance);

    if (_tempBox.intersectsBox(_childBox)) {
      collisions.push(child);
    }
  });

  return collisions;
}

export function hasCollision(
  movedObject: THREE.Object3D,
  scene: THREE.Group,
  ignoreList: THREE.Object3D[],
  tolerance = -0.001,
): boolean {
  _movedBox.setFromObject(movedObject);
  _movedBox.expandByScalar(tolerance);

  let collisionFound = false;

  scene.traverse((child) => {
    if (collisionFound) return;
    if (!child.visible) return;
    if (child === movedObject) return;
    if (movedObject.getObjectById(child.id)) return;
    if (child.userData.isSlot) return;

    const isIgnored = ignoreList.some(
      (ignoredObj) =>
        ignoredObj === child || ignoredObj.getObjectById(child.id),
    );
    if (isIgnored) return;

    if (!isMesh(child)) return;

    _childBox.setFromObject(child);

    if (_movedBox.intersectsBox(_childBox)) {
      collisionFound = true;
    }
  });

  return collisionFound;
}
