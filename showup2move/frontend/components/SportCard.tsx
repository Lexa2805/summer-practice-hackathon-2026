import { Activity } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Sport } from "@/lib/types";

export function SportCard({ sport }: { sport: Sport }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{sport.name}</CardTitle>
          <Activity className="h-5 w-5 text-primary" aria-hidden />
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-between">
        <Badge className="border-primary/20 bg-primary/10 text-primary">
          {sport.min_players}-{sport.max_players} players
        </Badge>
        <span className="text-sm text-muted-foreground">Auto-match ready</span>
      </CardContent>
    </Card>
  );
}

