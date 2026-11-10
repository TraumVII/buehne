import * as THREE from 'three';

export async function captureCanvas(options) {
  const {
    renderer,
    scene,
    camera,
    width,
    height,
    mode = 'color',
    prepare,
    restore
  } = options;

  prepare?.();

  const previousPixelRatio = renderer.getPixelRatio();
  const previousSize = new THREE.Vector2();
  renderer.getSize(previousSize);

  renderer.setPixelRatio(1);
  renderer.setSize(width, height, false);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.setClearColor(0x111115, 1);

  const previousAspect = camera.aspect;
  const previousFov = camera.fov;
  const previousNear = camera.near;
  const previousFar = camera.far;

  camera.aspect = width / height;
  if (mode === 'depth') {
    camera.near = 0.4;
    camera.far = 14;
  }
  camera.updateProjectionMatrix();

  let depthMaterial = null;
  if (mode === 'depth') {
    depthMaterial = new THREE.MeshDepthMaterial();
    scene.overrideMaterial = depthMaterial;
  }

  renderer.render(scene, camera);
  let blob = await new Promise((resolve) => {
    renderer.domElement.toBlob((result) => resolve(result), 'image/png');
  });

  if (mode === 'gray' && blob) {
    blob = await toGrayscaleBlob(blob, width, height);
  }

  if (depthMaterial) {
    scene.overrideMaterial = null;
    depthMaterial.dispose();
  }

  camera.aspect = previousAspect;
  camera.fov = previousFov;
  camera.near = previousNear;
  camera.far = previousFar;
  camera.updateProjectionMatrix();

  renderer.setPixelRatio(previousPixelRatio);
  renderer.setSize(previousSize.x, previousSize.y, false);

  restore?.();

  return { blob, width, height };
}

async function toGrayscaleBlob(blob, width, height) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  ctx.putImageData(image, 0, 0);
  bitmap.close?.();
  return new Promise((resolve) => canvas.toBlob((result) => resolve(result), 'image/png'));
}

export async function shareOrDownload(blob, filename) {
  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (error) {
      if (error && error.name === 'AbortError') return 'aborted';
    }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2500);
}

export function resolutionFromLongEdge(longEdge, aspect) {
  let width;
  let height;
  if (aspect >= 1) {
    width = longEdge;
    height = Math.max(2, Math.round(longEdge / aspect));
  } else {
    height = longEdge;
    width = Math.max(2, Math.round(longEdge * aspect));
  }
  width -= width % 2;
  height -= height % 2;
  return { width, height };
}
