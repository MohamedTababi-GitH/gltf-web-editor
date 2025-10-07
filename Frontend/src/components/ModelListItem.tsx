import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { formatDateTime } from "@/utils/DateTime.ts";
import { Badge } from "@/components/ui/badge.tsx";

function ModelListItem({
  item,
  key,
}: {
  key: number;
  item: {
    name: string;
    size: string;
    date: Date;
  };
}) {
  return (
    <Card
      key={key}
      className="max-w-md pb-0 hover:cursor-pointer hover:scale-98 transition-all duration-200 ease-in-out"
    >
      <CardHeader>
        <CardTitle>{item.name}</CardTitle>
        <div className={`flex gap-x-2`}>
          <Badge>{item.size}</Badge>
          <Badge variant={"date"}>
            {formatDateTime(item.date.toISOString()).dateStr}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <img
          src="https://cdn.shadcnstudio.com/ss-assets/components/card/image-1.png?height=280&format=auto"
          alt="Banner"
          className="aspect-video h-70 rounded-b-xl object-cover"
        />
      </CardContent>
    </Card>
  );
}

export default ModelListItem;
