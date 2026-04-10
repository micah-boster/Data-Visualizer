import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Data Visualizer</CardTitle>
          <CardDescription>
            Snowflake connection will appear here
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-sm text-muted-foreground">
            Phase 1 layout shell is ready. The data layer will be connected next.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
