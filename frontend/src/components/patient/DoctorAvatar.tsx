// Generic fallback portrait (Pexels, free-to-use license) for doctors who
// haven't uploaded a real photo yet — no photo-upload feature exists today,
// so every seeded sample doctor falls back to this until that's built.
const FALLBACK_PHOTO =
  "https://images.pexels.com/photos/5234519/pexels-photo-5234519.jpeg?auto=compress&cs=tinysrgb&w=200";

export function DoctorAvatar({
  photoUrl,
  name,
  className = "w-14 h-14",
}: {
  photoUrl?: string | null;
  name: string;
  className?: string;
}) {
  return (
    <img
      src={photoUrl || FALLBACK_PHOTO}
      alt={name}
      loading="lazy"
      className={`${className} rounded-full object-cover shrink-0`}
    />
  );
}
