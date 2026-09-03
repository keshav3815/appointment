/** Real photos (Pexels, free-to-use license) of a doctor actually doing each
 * specialty's work — picked and eyeballed one by one, not auto-generated —
 * for the "Browse by Specialty" cards. Swap the URL here to replace any of
 * them later; each is a stable Pexels CDN link. */
const PHOTOS: Record<string, string> = {
  "General Medicine": "https://images.pexels.com/photos/7580254/pexels-photo-7580254.jpeg?auto=compress&cs=tinysrgb&w=600",
  Orthopaedics: "https://images.pexels.com/photos/7446985/pexels-photo-7446985.jpeg?auto=compress&cs=tinysrgb&w=600",
  Cardiology: "https://images.pexels.com/photos/5207102/pexels-photo-5207102.jpeg?auto=compress&cs=tinysrgb&w=600",
  Dermatology: "https://images.pexels.com/photos/5701545/pexels-photo-5701545.jpeg?auto=compress&cs=tinysrgb&w=600",
  ENT: "https://images.pexels.com/photos/5206946/pexels-photo-5206946.jpeg?auto=compress&cs=tinysrgb&w=600",
  Gynaecology: "https://images.pexels.com/photos/7088531/pexels-photo-7088531.jpeg?auto=compress&cs=tinysrgb&w=600",
  Neurology: "https://images.pexels.com/photos/6010864/pexels-photo-6010864.jpeg?auto=compress&cs=tinysrgb&w=600",
  Paediatrics: "https://images.pexels.com/photos/5867700/pexels-photo-5867700.jpeg?auto=compress&cs=tinysrgb&w=600",
  Ophthalmology: "https://images.pexels.com/photos/5752294/pexels-photo-5752294.jpeg?auto=compress&cs=tinysrgb&w=600",
  Psychiatry: "https://images.pexels.com/photos/9064679/pexels-photo-9064679.jpeg?auto=compress&cs=tinysrgb&w=600",
};

export function SpecialtyIcon({ name, className = "w-full h-full" }: { name: string; className?: string }) {
  const url = PHOTOS[name];
  if (!url) return null;
  return <img src={url} alt={`${name} specialist at work`} loading="lazy" className={`${className} object-cover`} />;
}
