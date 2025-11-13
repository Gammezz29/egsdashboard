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

  const resolveRedirectUrl = (): string => {
    if (typeof options?.redirectTo === "string" && options.redirectTo.trim().length > 0) {
      return options.redirectTo.trim();
    }

    const envRedirect =
      typeof import.meta.env.VITE_SUPABASE_INVITE_REDIRECT === "string"
        ? import.meta.env.VITE_SUPABASE_INVITE_REDIRECT.trim()
        : "";
    if (envRedirect) {
      return envRedirect;
    }

    if (typeof window !== "undefined") {
      const origin = window.location.origin;
      if (origin.includes("localhost")) {
        return `${origin}/login`;
      }

      if (origin.includes("dashboard.egsai.dev")) {
        return `${origin}/login`;
      }
    }

    return "https://dashboard.egsai.dev/login";
  };

  const redirectUrl = resolveRedirectUrl();

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
