type LoadModelProps = {
  file: File;
  dependentFiles: File[];
  objectUrlsToRevoke: string[];
  setProcessedModelUrl: (url: string) => void;
  isMounted: boolean;
};

export const loadModel = async ({
  file,
  dependentFiles,
  objectUrlsToRevoke,
  setProcessedModelUrl,
  isMounted,
}: LoadModelProps) => {
  console.log("Loading Model:", file.name);
  if (file.name.toLowerCase().endsWith(".glb")) {
    const url = URL.createObjectURL(file);
    objectUrlsToRevoke.push(url);
    if (isMounted) {
      setProcessedModelUrl(url);
    }
    return;
  }

  const fileMap = new Map<string, string>();
  dependentFiles.forEach((file) => {
    const url = URL.createObjectURL(file);
    fileMap.set(file.name, url);
    objectUrlsToRevoke.push(url);
  });

  const gltfText = await file.text();
  const gltfJson = JSON.parse(gltfText);

  const replaceUri = (uri: string) => fileMap.get(uri) || uri;
  if (gltfJson.buffers) {
    for (const buffer of gltfJson.buffers) {
      if (buffer.uri && fileMap.has(buffer.uri)) {
        buffer.uri = replaceUri(buffer.uri);
      }
    }
  }
  if (gltfJson.images) {
    for (const image of gltfJson.images) {
      if (image.uri && fileMap.has(image.uri)) {
        image.uri = replaceUri(image.uri);
      }
    }
  }

  const patchedGltfString = JSON.stringify(gltfJson);
  const patchedGltfBlob = new Blob([patchedGltfString], {
    type: "application/json",
  });
  const newGltfUrl = URL.createObjectURL(patchedGltfBlob);
  objectUrlsToRevoke.push(newGltfUrl);

  if (isMounted) {
    setProcessedModelUrl(newGltfUrl);
  }
};
