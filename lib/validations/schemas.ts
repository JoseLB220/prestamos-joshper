import { z } from "zod"

// ------------------------------------------------------------------------------
// ESQUEMAS DE VALIDACIÓN ZOD PARA API
// ------------------------------------------------------------------------------

// 1. Registro de Usuario
export const userRegisterSchema = z.object({
  nombre: z
    .string({ required_error: "El nombre es obligatorio" })
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede exceder 100 caracteres"),
  apellido: z
    .string({ required_error: "El apellido es obligatorio" })
    .min(2, "El apellido debe tener al menos 2 caracteres")
    .max(100, "El apellido no puede exceder 100 caracteres"),
  email: z
    .string({ required_error: "El correo electrónico es obligatorio" })
    .email("El formato del correo electrónico es inválido"),
  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(6, "La contraseña debe tener al menos 6 caracteres")
    .max(100, "La contraseña no puede exceder 100 caracteres"),
  cedula_pasaporte: z
    .string()
    .optional()
    .nullable(),
  telefono: z
    .string()
    .optional()
    .nullable(),
  direccion: z
    .string()
    .optional()
    .nullable(),
  documento_foto: z
    .string()
    .optional()
    .nullable(),
})

// 2. Login de Usuario
export const userLoginSchema = z.object({
  email: z
    .string({ required_error: "El correo electrónico es obligatorio" })
    .email("Correo electrónico inválido"),
  password: z
    .string({ required_error: "La contraseña es obligatoria" })
    .min(1, "Ingresa tu contraseña"),
})

// 3. Solicitud de Préstamo
export const loanApplicationSchema = z.object({
  amount: z
    .number({ required_error: "El monto es obligatorio" })
    .positive("El monto debe ser un número positivo")
    .min(1000, "El monto mínimo de préstamo es DOP 1,000")
    .max(5000000, "El monto máximo de préstamo es DOP 5,000,000"),
  months: z
    .number({ required_error: "El plazo en meses es obligatorio" })
    .int("El plazo debe ser un número entero")
    .min(1, "El plazo mínimo es 1 mes")
    .max(120, "El plazo máximo es 120 meses"),
  interestRate: z
    .number()
    .optional()
    .default(10),
  reason: z
    .string()
    .optional()
    .nullable(),
  company_id: z
    .number()
    .optional()
    .nullable(),
  documento_foto: z
    .string()
    .optional()
    .nullable(),
})

// 4. Registro / Solicitud de Pago
export const paymentApplySchema = z.object({
  loan_id: z
    .number({ required_error: "El ID del préstamo es obligatorio" })
    .positive("ID de préstamo inválido"),
  payment_amount: z
    .number({ required_error: "El monto del pago es obligatorio" })
    .positive("El monto debe ser mayor a 0"),
  payment_type: z
    .enum(["installment", "extra"], {
      required_error: "El tipo de pago debe ser 'installment' o 'extra'",
    })
    .default("installment"),
  notes: z
    .string()
    .optional()
    .nullable(),
  receipt_url: z
    .string()
    .optional()
    .nullable(),
})

// 5. Asociación de Empresa
export const companyAssociateSchema = z.object({
  company_name: z
    .string({ required_error: "El nombre de la empresa es obligatorio" })
    .min(2, "Nombre de empresa muy corto"),
  rnc: z
    .string()
    .optional()
    .nullable(),
  position: z
    .string()
    .optional()
    .nullable(),
  salary: z
    .number()
    .optional()
    .nullable(),
})

// Helper genérico para formatear errores de Zod a mensaje legible
export function formatZodError(error: z.ZodError): string {
  return error.errors.map((e) => e.message).join(", ")
}
