import ModelListItem from "@/components/ListView/ModelListItem.tsx";
import { useEffect, useState } from "react";
import { useAxiosConfig } from "@/services/AxiosConfig.tsx";
import type { ModelItem } from "@/types/ModelItem.ts";

function ListView() {
  const [models, setModels] = useState<ModelItem[]>([]);
  const apiClient = useAxiosConfig();

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const res = await apiClient.get("/api/model");
        const data = res.data;
        setModels(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchModels();
  }, [apiClient]);

  return (
    <div className={`grid justify-center w-full`}>
      <div className={`m-4 md:m-8 lg:m-12 xl:m-16 max-w-screen `}>
        <div
          className={`flex justify-between px-2 font-medium text-sm md:text-lg lg:text-xl`}
        >
          <h1 className={`mb-3`}>Table of Models</h1>
          <h1 className={`text-muted-foreground mb-3`}>
            {models?.length || 0} results found
          </h1>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full`}
        >
          {models?.map((item) => (
            <ModelListItem key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ListView;
