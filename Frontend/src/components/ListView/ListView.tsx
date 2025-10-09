import ModelListItem from "@/components/ListView/ModelListItem.tsx";

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
    {
      name: "Model 6",
      size: "50 MB",
      date: new Date(),
    },
    {
      name: "Model 7",
      size: "50 MB",
      date: new Date(),
    },
    {
      name: "Model 8",
      size: "50 MB",
      date: new Date(),
    },
    {
      name: "Model 9",
      size: "50 MB",
      date: new Date(),
    },
  ];

  return (
    <div className={`grid justify-center w-full`}>
      <div className={`m-4 md:m-8 lg:m-12 xl:m-16 max-w-screen `}>
        <div
          className={`flex justify-between px-2 font-medium text-sm md:text-lg lg:text-xl`}
        >
          <h1 className={`mb-3`}>Table of Models</h1>
          <h1 className={`text-muted-foreground mb-3`}>
            {data.length} results found
          </h1>
        </div>

        <div
          className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full`}
        >
          {data.map((item, i) => (
            <ModelListItem key={i} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ListView;
