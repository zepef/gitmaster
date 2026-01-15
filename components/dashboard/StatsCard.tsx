import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: number
  description?: string
  icon: LucideIcon
  variant?: "default" | "warning" | "success"
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  variant = "default",
}: StatsCardProps) {
  const iconColors = {
    default: "text-zinc-500",
    warning: "text-amber-500",
    success: "text-green-500",
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconColors[variant]}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-zinc-500">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
