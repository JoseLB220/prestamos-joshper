"use client"

import React, { useState, useEffect } from "react"
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "./alert-dialog"
import { Button } from "@/components/ui/button"

type Props = {
  open: boolean
  title?: string
  description?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
  onOpenChange?: (open: boolean) => void
  onConfirm: (value: string) => void
  onCancel?: () => void
}

export default function ProjectPrompt({
  open,
  title = "Confirmar acción",
  description,
  placeholder = "Escribe una nota...",
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  onOpenChange,
  onConfirm,
  onCancel,
}: Props) {
  const [value, setValue] = useState("")

  useEffect(() => {
    if (open) setValue("")
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={(o: boolean) => onOpenChange?.(o)}>
      {/* Force white card and visible border so textarea and buttons contrast against the dark overlay */}
      <AlertDialogContent className="max-w-xl bg-white border border-gray-200 shadow-lg rounded-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-blue-700">{title}</AlertDialogTitle>
          {description ? (
            <AlertDialogDescription className="text-sm text-slate-600">{description}</AlertDialogDescription>
          ) : null}
        </AlertDialogHeader>

        <div className="mt-4">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full min-h-[100px] border border-gray-200 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            {/* Cancel should be red per design request */}
            <Button variant="destructive">{cancelLabel}</Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            {/* Confirm should be primary/blue */}
            <Button
              onClick={() => {
                onConfirm(value)
              }}
            >
              {confirmLabel}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
