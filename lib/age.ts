export function calculateAge(birthDate?: string | null, ageManual?: number | null): number | null {
  if (birthDate) {
    const birth = new Date(birthDate);
    if (!Number.isNaN(birth.getTime())) {
      const now = new Date();
      let age = now.getFullYear() - birth.getFullYear();
      const hasHadBirthdayThisYear =
        now.getMonth() > birth.getMonth() ||
        (now.getMonth() === birth.getMonth() && now.getDate() >= birth.getDate());
      if (!hasHadBirthdayThisYear) age -= 1;
      return age;
    }
  }
  if (ageManual && ageManual > 0) return ageManual;
  return null;
}
