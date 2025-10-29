import { getAdminSupabaseClient } from "@/lib/adminSupabaseClient";

export type InviteDashboardUserResult = {
  userId: string | null;
  emailSent: boolean;
};

export const inviteDashboardUser = async (
  email: string,
  role: string,
  options?: { redirectTo?: string },
): Promise<InviteDashboardUserResult> => {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    throw new Error("Ingrese un correo válido.");
  }

  const trimmedRole = role.trim();
  if (!trimmedRole) {
    throw new Error("Seleccione o ingrese un rol para el usuario.");
  }

  const redirectUrl =
    typeof options?.redirectTo === "string" && options.redirectTo.trim().length > 0
      ? options.redirectTo.trim()
      : typeof window !== "undefined"
        ? `${window.location.origin}/login`
        : undefined;

  const client = getAdminSupabaseClient();

  const { data, error } = await client.auth.admin.inviteUserByEmail(
    trimmedEmail,
    {
      data: { role: trimmedRole },
      redirectTo: redirectUrl,
    },
  );

  if (error) {
    throw new Error(error.message || "No se pudo enviar la invitación.");
  }

  if (data?.id) {
    try {
      await client.auth.admin.updateUserById(data.id, {
        app_metadata: { role: trimmedRole },
      });
    } catch (updateError) {
      console.warn("No se pudo sincronizar el rol en app_metadata para el usuario invitado.", updateError);
    }
  }

  return {
    userId: data?.id ?? null,
    emailSent: true,
  };
};
