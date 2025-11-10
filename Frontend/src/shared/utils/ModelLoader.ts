type LoadModelProps = {
  file: File;
  dependentFiles: File[];
  objectUrlsToRevoke: string[];
  setProcessedModelUrl: (url: string) => void;
  isMounted: boolean;
};

const patchGltfUris = (
  resources: { uri?: string }[] | undefined,
  fileMap: Map<string, string>,
) => {
  if (!resources) {
    return;
  }

  const replaceUri = (uri: string) => fileMap.get(uri) || uri;

  for (const resource of resources) {
    const { uri } = resource;

    if (uri && fileMap.has(uri)) {
      resource.uri = replaceUri(uri);
    }
  }
};

export const loadModel = async ({
  file,
  dependentFiles,
  objectUrlsToRevoke,
  setProcessedModelUrl,
  isMounted,
}: LoadModelProps) => {
  if (file.name.toLowerCase().endsWith(".glb")) {
    const url = URL.createObjectURL(file);
    objectUrlsToRevoke.push(url);
    if (isMounted) {
      setProcessedModelUrl(url);
    }
    return;
  }

  const fileMap = new Map<string, string>();
  for (const file of dependentFiles) {
    const url = URL.createObjectURL(file);
    fileMap.set(file.name, url);
    objectUrlsToRevoke.push(url);
  }

  const gltfText = await file.text();
  const gltfJson = JSON.parse(gltfText);

  patchGltfUris(gltfJson.buffers, fileMap);
  patchGltfUris(gltfJson.images, fileMap);

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
