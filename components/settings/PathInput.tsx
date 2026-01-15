"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FolderOpen } from "lucide-react"

interface PathInputProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  description?: string
  error?: string
  required?: boolean
}

export function PathInput({
  id,
  label,
  value,
  onChange,
  placeholder = "E:\\Projects",
  description,
  error,
  required,
}: PathInputProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <FolderOpen className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`pl-10 font-mono ${error ? "border-red-500" : ""}`}
        />
      </div>
      {description && !error && (
        <p className="text-xs text-zinc-500">{description}</p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
