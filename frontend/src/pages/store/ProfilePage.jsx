import { useEffect, useMemo, useState } from "react";
import { Camera, CheckCircle2, LoaderCircle, LockKeyhole, Save, ShieldCheck, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { getMyProfile, updateMyPassword, updateMyProfile } from "../../services/profileService";
import { optimizeImageUrl } from "../../utils/media";

function buildInitials(value) {
  return String(value || "")
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] || "")
    .join("")
    .toUpperCase();
}

export default function ProfilePage() {
  const { refreshUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [removeAvatar, setRemoveAvatar] = useState(false);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    name: "",
    email: "",
    phone: "",
    birthDate: "",
    gender: ""
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  useEffect(() => {
    let mounted = true;

    async function loadProfile() {
      try {
        const data = await getMyProfile();
        if (!mounted) {
          return;
        }

        setProfile(data);
        setProfileForm({
          firstName: data.firstName || "",
          lastName: data.lastName || "",
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          birthDate: data.birthDate || "",
          gender: data.gender || ""
        });
      } catch (requestError) {
        if (!mounted) {
          return;
        }
        setError(requestError.response?.data?.message || "Unable to load your profile right now.");
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => () => {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }
  }, [avatarPreview]);

  const effectiveAvatar = useMemo(() => {
    if (avatarPreview) {
      return avatarPreview;
    }

    if (!removeAvatar && profile?.avatar) {
      return optimizeImageUrl(profile.avatar, { width: 160, height: 160, fit: "fill" });
    }

    return "";
  }, [avatarPreview, profile?.avatar, removeAvatar]);

  const initials = useMemo(() => buildInitials(profileForm.name || profile?.name || "MC"), [profile?.name, profileForm.name]);

  function handleProfileField(field, value) {
    setProfileForm((current) => {
      const next = { ...current, [field]: value };

      if (field === "firstName" || field === "lastName") {
        next.name = [field === "firstName" ? value : current.firstName, field === "lastName" ? value : current.lastName]
          .filter(Boolean)
          .join(" ")
          .trim();
      }

      return next;
    });
  }

  function handlePasswordField(field, value) {
    setPasswordForm((current) => ({ ...current, [field]: value }));
  }

  function handleAvatarSelect(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setRemoveAvatar(false);
    setMessage("");
    setError("");
  }

  function handleRemoveAvatar() {
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarPreview("");
    setAvatarFile(null);
    setRemoveAvatar(true);
    setMessage("");
    setError("");
  }

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setProfileSaving(true);
    setMessage("");
    setError("");

    try {
      const formData = new FormData();
      formData.append("firstName", profileForm.firstName);
      formData.append("lastName", profileForm.lastName);
      formData.append("name", profileForm.name);
      formData.append("email", profileForm.email);
      formData.append("phone", profileForm.phone);
      if (profile?.role !== "admin") {
        formData.append("birthDate", profileForm.birthDate || "");
        formData.append("gender", profileForm.gender || "");
      }
      if (avatarFile) {
        formData.append("avatar", avatarFile);
      }
      if (removeAvatar) {
        formData.append("removeAvatar", "true");
      }

      const data = await updateMyProfile(formData);
      setProfile(data.user);
      setProfileForm({
        firstName: data.user.firstName || "",
        lastName: data.user.lastName || "",
        name: data.user.name || "",
        email: data.user.email || "",
        phone: data.user.phone || "",
        birthDate: data.user.birthDate || "",
        gender: data.user.gender || ""
      });
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
      setAvatarPreview("");
      setRemoveAvatar(false);
      await refreshUser();
      setMessage(data.message || "Profile updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to save your profile right now.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setPasswordSaving(true);
    setMessage("");
    setError("");

    try {
      const data = await updateMyPassword(passwordForm);
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      setMessage(data.message || "Password updated successfully.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to update your password right now.");
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell py-12">
        <div className="mx-auto flex max-w-5xl items-center justify-center rounded-[36px] border border-white/10 bg-slate-950/50 p-16 text-slate-300">
          <LoaderCircle size={20} className="mr-3 animate-spin" />
          Loading your profile...
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell py-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <div className="glass-panel rounded-[32px] p-6 shadow-ambient">
            <p className="text-[11px] uppercase tracking-[0.26em] text-slate-400">Profile</p>
            <h1 className="mt-3 text-3xl font-semibold text-white">Personal details and security</h1>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Keep your account details updated so orders, repairs, and support messages always point to the right contact information.
            </p>

            <div className="mt-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-center">
              <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-brand-500 to-orange-400 text-2xl font-semibold text-white">
                {effectiveAvatar ? (
                  <img src={effectiveAvatar} alt={profile?.name || "Profile"} className="h-full w-full object-cover" />
                ) : (
                  initials || "MC"
                )}
              </div>
              <p className="mt-4 text-lg font-semibold text-white">{profile?.name}</p>
              <p className="mt-1 text-sm text-slate-400">{profile?.email}</p>
              {profile?.role !== "admin" && profile?.birthDate ? (
                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                  {profile.birthDate} {profile?.gender ? `• ${String(profile.gender).replaceAll("_", " ")}` : ""}
                </p>
              ) : null}
              <p className="mt-4 inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-slate-300">
                {profile?.role || "customer"}
              </p>

              <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600">
                <Camera size={16} />
                Upload profile picture
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarSelect} />
              </label>
              <button
                type="button"
                onClick={handleRemoveAvatar}
                className="mt-3 block w-full rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:bg-white/10"
              >
                Remove current photo
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {(message || error) && (
              <div className={`rounded-[28px] border px-5 py-4 text-sm ${error ? "border-rose-400/20 bg-rose-500/10 text-rose-100" : "border-emerald-400/20 bg-emerald-500/10 text-emerald-50"}`}>
                {message || error}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="glass-panel rounded-[32px] p-6 shadow-ambient">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-white">
                  <UserRound size={20} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Personal details</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Edit your profile information</h2>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">First name</span>
                  <input
                    value={profileForm.firstName}
                    onChange={(event) => handleProfileField("firstName", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="First name"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Last name</span>
                  <input
                    value={profileForm.lastName}
                    onChange={(event) => handleProfileField("lastName", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="Last name"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Full name</span>
                  <input
                    value={profileForm.name}
                    onChange={(event) => handleProfileField("name", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="Your full name"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Email address</span>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={(event) => handleProfileField("email", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="space-y-2 md:col-span-2">
                  <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Mobile number</span>
                  <input
                    value={profileForm.phone}
                    onChange={(event) => handleProfileField("phone", event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                    placeholder="09XXXXXXXXX"
                  />
                </label>
                {profile?.role !== "admin" ? (
                  <>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Birthday / Date of birth</span>
                      <input
                        type="date"
                        value={profileForm.birthDate}
                        onChange={(event) => handleProfileField("birthDate", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Gender</span>
                      <select
                        value={profileForm.gender}
                        onChange={(event) => handleProfileField("gender", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                      >
                        <option value="">Select your gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="prefer_not_to_say">Prefer not to say</option>
                      </select>
                    </label>
                  </>
                ) : null}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-brand-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {profileSaving ? <LoaderCircle size={16} className="animate-spin" /> : <Save size={16} />}
                  Save profile changes
                </button>
                <p className="text-sm text-slate-400">
                  This updates the {profile?.role !== "admin" ? "name, email, number, birthday, and photo" : "name, email, number, and photo"} you use across the store.
                </p>
              </div>
            </form>

            <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-[20px] border border-white/10 bg-white/5 text-white">
                  <ShieldCheck size={20} />
                </span>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Password and security</p>
                  <h2 className="mt-1 text-xl font-semibold text-white">Keep your account secure</h2>
                </div>
              </div>

              <div className="mt-6 rounded-[24px] border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-slate-300">
                <p className="font-semibold text-white">Sign-in method</p>
                <p className="mt-2">
                  {profile?.authProvider === "local"
                    ? "You use an email and password account."
                    : `You currently sign in with ${String(profile?.authProvider || "social").replace(/^./, (value) => value.toUpperCase())}.`}
                </p>
              </div>

              {profile?.hasPassword ? (
                <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Current password</span>
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(event) => handlePasswordField("currentPassword", event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                      placeholder="Enter your current password"
                    />
                  </label>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">New password</span>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(event) => handlePasswordField("newPassword", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                        placeholder="At least 8 characters"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-xs uppercase tracking-[0.22em] text-slate-400">Confirm new password</span>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(event) => handlePasswordField("confirmPassword", event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-white outline-none transition focus:border-brand-400/50"
                        placeholder="Type it again"
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <button
                      type="submit"
                      disabled={passwordSaving}
                      className="inline-flex min-h-[52px] items-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {passwordSaving ? <LoaderCircle size={16} className="animate-spin" /> : <LockKeyhole size={16} />}
                      Update password
                    </button>
                    <p className="text-sm text-slate-400">Use at least 8 characters with uppercase, lowercase, and a number.</p>
                  </div>
                </form>
              ) : (
                <div className="mt-6 rounded-[24px] border border-amber-400/20 bg-amber-500/10 px-5 py-4 text-sm text-amber-100">
                  This account currently uses social sign-in, so password changes are not available from this page yet.
                </div>
              )}
            </section>

            <section className="glass-panel rounded-[32px] p-6 shadow-ambient">
              <div className="flex items-start gap-3">
                <CheckCircle2 size={20} className="mt-0.5 text-emerald-300" />
                <div>
                  <h2 className="text-lg font-semibold text-white">What updates here affect</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    Your account details here are used across checkout, repair bookings, chat identity, and support contact details so the store always reaches the right person.
                  </p>
                </div>
              </div>
            </section>
          </div>
        </section>
      </div>
    </div>
  );
}
