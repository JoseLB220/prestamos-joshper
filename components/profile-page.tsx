"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { User, Edit, Save, X, Calendar, Shield, Phone, Mail, BadgeIcon as IdCard, Camera, Clock } from "lucide-react"

interface ProfileFormProps {
  user: {
    id: number
    nombre: string
    apellido: string
    email: string
    is_admin: boolean
  }
}

export default function ProfileForm({ user }: ProfileFormProps) {
  const [profile, setProfile] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    email: "",
    cedula_pasaporte: "",
    numero_celular: "",
  })

  const { toast } = useToast()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/profile")
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          nombre: data.nombre || "",
          apellido: data.apellido || "",
          email: data.email || "",
          cedula_pasaporte: data.cedula_pasaporte || "",
          numero_celular: data.numero_celular || "",
        })
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al cargar el perfil",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Error",
        description: "Error al cargar el perfil",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)

      // Validate required fields
      if (!formData.nombre.trim() || !formData.apellido.trim() || !formData.numero_celular.trim() || !formData.email.trim() || !formData.cedula_pasaporte.trim()) {
        toast({
          title: "Error",
          description: "Nombre, apellido, número de celular, email y documento de identidad son requeridos",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          apellido: formData.apellido.trim(),
          email: formData.email.trim(),
          cedula_pasaporte: formData.cedula_pasaporte.trim(),
          numero_celular: formData.numero_celular.trim(),
        }),
      })

      if (response.ok) {
        toast({
          title: "Perfil actualizado",
          description: "Tu perfil ha sido actualizado exitosamente",
        })
        setIsEditing(false)
        await fetchProfile() // Refresh the profile data
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Error al actualizar el perfil",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Error al actualizar el perfil",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    if (profile) {
      setFormData({
        nombre: profile.nombre || "",
        apellido: profile.apellido || "",
        email: profile.email || "",
        cedula_pasaporte: profile.cedula_pasaporte || "",
        numero_celular: profile.numero_celular || "",
      })
    }
    setIsEditing(false)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-medium">Cargando perfil...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <User size={64} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 font-medium">No se pudo cargar el perfil</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-3">
                  <User size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
                  <p className="text-blue-100">Gestiona tu información personal</p>
                </div>
              </div>
              {profile.is_admin && (
                <div className="bg-red-500/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className="text-red-100 text-sm font-medium flex items-center">
                    <Shield size={16} className="mr-1" />
                    Administrador
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Edit Restrictions Warning */}
        {!user.is_admin && (profile.profile_edits_count || 0) >= 2 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start space-x-3">
              <Clock size={20} className="text-amber-600 mt-0.5" />
              <div>
                <p className="text-amber-800 font-medium">Límite de ediciones alcanzado</p>
                <p className="text-amber-700 text-sm mt-1">
                  Has editado tu perfil {profile.profile_edits_count} veces. Debes esperar un mes desde tu última
                  edición para poder editarlo nuevamente.
                </p>
                {profile.last_profile_edit && (
                  <p className="text-amber-600 text-xs mt-2">
                    Última edición: {new Date(profile.last_profile_edit).toLocaleDateString("es-DO")}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            {/* Personal Information Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <User size={24} className="mr-2 text-blue-600" />
                  Información Personal
                </h2>
                {!isEditing && (
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={() => setIsEditing(true)}
                    disabled={!user.is_admin && (profile.profile_edits_count || 0) >= 2}
                  >
                    <Edit size={16} />
                    <span>Editar</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <User size={16} className="mr-2 text-gray-400" />
                    Nombre
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <span className="text-gray-900 font-medium">{profile.nombre}</span>
                    </div>
                  )}
                </div>

                {/* Apellido */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <User size={16} className="mr-2 text-gray-400" />
                    Apellido
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="apellido"
                      value={formData.apellido}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <span className="text-gray-900 font-medium">{profile.apellido}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Mail size={16} className="mr-2 text-gray-400" />
                    Correo Electrónico
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <span className="text-gray-900 font-medium">{profile.email}</span>
                    </div>
                  )}
                </div>

                {/* Documento */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <IdCard size={16} className="mr-2 text-gray-400" />
                    Documento de Identidad
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="cedula_pasaporte"
                      value={formData.cedula_pasaporte}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <span className="text-gray-900 font-medium">{profile.cedula_pasaporte}</span>
                    </div>
                  )}
                </div>

                {/* Teléfono */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Phone size={16} className="mr-2 text-gray-400" />
                    Número de Celular
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      name="numero_celular"
                      value={formData.numero_celular}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <span className="text-gray-900 font-medium">{profile.numero_celular}</span>
                    </div>
                  )}
                </div>

                {/* Foto del Documento */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-medium text-gray-700">
                    <Camera size={16} className="mr-2 text-gray-400" />
                    Foto del Documento
                  </label>
                  {profile.documento_foto ? (
                    <div className="flex justify-center">
                      {/*
                        documento_foto may be:
                        - a full URL (http/https)
                        - a data URL (data:image/png;base64,...)
                        - a path like '/uploads/...' or just a filename
                        Use full and data URLs directly; upload paths are served by this origin.
                      */}
                      <img
                        src={
                          profile.documento_foto.startsWith("http") || profile.documento_foto.startsWith("data:")
                            ? profile.documento_foto
                            : `${profile.documento_foto.startsWith("/") ? profile.documento_foto : `/uploads/${profile.documento_foto}`}`
                        }
                        alt="Foto del Documento"
                        className="max-w-xs h-auto rounded-lg border border-gray-300"
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg border border-gray-200">
                      <span className="text-gray-900 font-medium">No especificado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Account Information Section */}
            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-xl font-bold text-gray-900 flex items-center mb-6">
                <Shield size={24} className="mr-2 text-blue-600" />
                Información de la Cuenta
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Fecha de Registro */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <div className="flex items-center space-x-3">
                    <Calendar size={20} className="text-blue-600" />
                    <div>
                      <p className="text-sm font-medium text-blue-900">Fecha de Registro</p>
                      <p className="text-blue-700 font-semibold">
                        {new Date(profile.created_at).toLocaleDateString("es-DO")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ediciones de Perfil */}
                <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                  <div className="flex items-center space-x-3">
                    <Edit size={20} className="text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-900">Ediciones de Perfil</p>
                      <p className="text-green-700 font-semibold">{profile.profile_edits_count || 0} / 2</p>
                    </div>
                  </div>
                </div>

                {/* Última Edición */}
                {profile.last_profile_edit && (
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                    <div className="flex items-center space-x-3">
                      <Clock size={20} className="text-amber-600" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">Última Edición</p>
                        <p className="text-amber-700 font-semibold">
                          {new Date(profile.last_profile_edit).toLocaleDateString("es-DO")}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Tipo de Usuario */}
                <div
                  className={`p-4 rounded-xl border ${profile.is_admin ? "bg-red-50 border-red-200" : "bg-indigo-50 border-indigo-200"}`}
                >
                  <div className="flex items-center space-x-3">
                    <Shield size={20} className={profile.is_admin ? "text-red-600" : "text-indigo-600"} />
                    <div>
                      <p className={`text-sm font-medium ${profile.is_admin ? "text-red-900" : "text-indigo-900"}`}>
                        Tipo de Usuario
                      </p>
                      <p className={`font-semibold ${profile.is_admin ? "text-red-700" : "text-indigo-700"}`}>
                        {profile.is_admin ? "Administrador" : "Usuario"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {isEditing && (
              <div className="border-t border-gray-200 pt-6 mt-8">
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200 flex items-center space-x-2"
                    onClick={handleCancel}
                    disabled={isSaving}
                  >
                    <X size={16} />
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="button"
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200 flex items-center space-x-2 disabled:opacity-50"
                    onClick={handleSave}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        <span>Guardar Cambios</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
