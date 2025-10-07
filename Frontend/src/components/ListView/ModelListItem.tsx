import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.tsx";
import { formatDateTime } from "@/utils/DateTime.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { useTheme } from "@/components/theme-provider.tsx";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";

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
  const theme = useTheme();
  const isDarkTheme =
    theme.theme === "dark" ||
    (theme.theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  const animationSrc = isDarkTheme
    ? "https://lottie.host/84a02394-70c0-4d50-8cdb-8bc19f297682/iIKdhe0iAy.lottie"
    : "https://lottie.host/686ee0e1-ae73-4c41-b425-538a3791abb0/SB6QB9GRdW.lottie";
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
        <DotLottieReact src={animationSrc} loop autoplay />
      </CardContent>
    </Card>
  );
}

export default ModelListItem;
