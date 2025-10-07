import ModelListItem from "@/components/ModelListItem.tsx";

function ListView() {
  const data = [
    {
      name: "CabinetCoolingWaterPump",
      size: "10 MB",
      date: new Date(),
    },
    {
      name: "Model 2",
      size: "20 MB",
      date: new Date(),
    },
    {
      name: "Model 3",
      size: "30 MB",
      date: new Date(),
    },
    {
      name: "Model 4",
      size: "40 MB",
      date: new Date(),
    },
    {
      name: "Model 5",
      size: "50 MB",
      date: new Date(),
    },
  ];

  return (
    <>
      <div className={`m-6`}>
        <div className={`flex justify-between px-2`}>
          <h1 className={`text-2xl font-medium mb-3`}>Table of Models</h1>
          <h1 className={`text-lg font-medium text-muted-foreground mb-3`}>
            {data.length} results found
          </h1>
        </div>

        <div className={`grid grid-cols-4 gap-4`}>
          {data.map((item, i) => (
            <ModelListItem key={i} item={item} />
          ))}
        </div>
      </div>
    </>
  );
}

export default ListView;
