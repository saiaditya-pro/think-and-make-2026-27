"""
One-off migration command: imports the login accounts from the
"T&M_PWA_Master - Users.pdf" master list into apps.accounts.User.

Admin/IIF rows become admin/iif_staff accounts keyed by email. School rows
become role=school accounts, one per school login, linked via the two-letter
School Code to an apps.schools.School row. Run `import_legacy_sheets` first
so the Datla schools (codes DA-DG) already exist with real enrollment data;
any other code this command encounters (currently prefixes M, U, I) has no
source data yet, so a bare School row is created for it under a placeholder
Partner/ProgramInstance grouped by that first letter, so the account can log
in and fill out its own forms once real data isn't otherwise available.

Usage:
    python manage.py import_master_users

Re-running is safe: users are upserted by username, and the PIN is
re-applied as the password every run (so this also doubles as a password
reset back to the sheet's values).
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.programs.models import Partner, ProgramInstance
from apps.schools.models import School

ROLE_MAP = {"Admin": User.ADMIN, "IIF": User.IIF_STAFF, "School": User.SCHOOL}

# Transcribed verbatim from docs/T&M_PWA_Master - Users.pdf.
# (username, name, role, school_code, pin, active)
ROWS = [
    ("admin@inqui-lab.org", "IIF Admin", "Admin", "", "TMADMIN@2026", True),
    ("vivek@inqui-lab.org", "Vivek", "IIF", "", "TMIIF@2026", True),
    ("eshwar@inqui-lab.org", "Eshwar", "IIF", "", "TMIIF@2026", True),
    ("sahithya@inqui-lab.org", "Sahithya Anumolu", "IIF", "", "TMIIF@2026", True),
    ("geethanjali@inqui-lab.org", "Geethanjali Polisetty", "IIF", "", "TMIIF@2026", True),
    ("nagesh@inqui-lab.org", "Nagesh Jogi", "IIF", "", "TMIIF@2026", True),
    ("shravan@inqui-lab.org", "Shravan Ganesh", "IIF", "", "TMIIF@2026", True),
    ("harish@inqui-lab.org", "Harish Gadi", "IIF", "", "TMIIF@2026", True),
    ("narsana@inqui-lab.org", "Narsana Mesa", "IIF", "", "TMIIF@2026", True),
    ("heena@inqui-lab.org", "Heena Dudekula", "IIF", "", "TMIIF@2026", True),
    ("abhinay@inqui-lab.org", "Abhinay Myana", "IIF", "", "TMIIF@2026", True),
    ("shruthi@inqui-lab.org", "Shruthi Vidiyala", "IIF", "", "TMIIF@2026", True),
    ("vandita@inqui-lab.org", "Vandita Churiwal", "IIF", "", "TMIIF@2026", True),
    ("sravya@inqui-lab.org", "Sravya Panangipalli", "IIF", "", "TMIIF@2026", True),
    ("muhsin@inqui-lab.org", "Muhsin J", "IIF", "", "TMIIF@2026", True),
    ("aaliya@inqui-lab.org", "Aaliya", "IIF", "", "TMIIF@2026", True),
    ("vijayasree@inqui-lab.org", "Vijayasree Asam", "IIF", "", "TMIIF@2026", True),
    ("TMDATURKAPALLY", "TURKAPALLY", "School", "DA", "TMDA@2026", True),
    ("TMDBRAJABOLLARAM", "RAJABOLLARAM", "School", "DB", "TMDB@2026", True),
    ("TMDCKOWKUR", "KOWKUR", "School", "DC", "TMDC@2026", True),
    ("TMDDTHUMKUNTA", "THUMKUNTA", "School", "DD", "TMDD@2026", True),
    ("TMDELALGADI MALAKPET", "LALGADI MALAKPET", "School", "DE", "TMDE@2026", True),
    ("TMDFALIABAD", "ALIABAD", "School", "DF", "TMDF@2026", True),
    ("TMDGHYDERNAGAR", "HYDERNAGAR", "School", "DG", "TMDG@2026", True),
    ("TMMAKOSGI", "KOSGI", "School", "MA", "TMMA@2026", True),
    ("TMMBMADDUR", "MADDUR", "School", "MB", "TMMB@2026", True),
    ("TMMCNIDJINTA", "NIDJINTA", "School", "MC", "TMMC@2026", True),
    ("TMMDBONEED", "BONEED", "School", "MD", "TMMD@2026", True),
    ("TMMEKOSGI", "KOSGI", "School", "ME", "TMME@2026", True),
    ("TMMFPALLERLA", "PALLERLA", "School", "MF", "TMMF@2026", True),
    ("TMMGKOSGI", "KOSGI", "School", "MG", "TMMG@2026", True),
    ("TMMHMUSHRIFA", "MUSHRIFA", "School", "MH", "TMMH@2026", True),
    ("TMMIMADDUR", "MADDUR", "School", "MI", "TMMI@2026", True),
    ("TMMJMADDUR", "MADDUR", "School", "MJ", "TMMJ@2026", True),
    ("TMMKGIRLSHS", "GIRLSHS", "School", "MK", "TMMK@2026", True),
    ("TMMLSHIVAJINAGAR", "SHIVAJINAGAR", "School", "ML", "TMML@2026", True),
    ("TMMMRENIVATLA", "RENIVATLA", "School", "MM", "TMMM@2026", True),
    ("TMMNJAJAPUR", "JAJAPUR", "School", "MN", "TMMN@2026", True),
    ("TMMOUTKUR", "UTKUR", "School", "MO", "TMMO@2026", True),
    ("TMMPNARAYANPET", "NARAYANPET", "School", "MP", "TMMP@2026", True),
    ("TMMQDHANWADA", "DHANWADA", "School", "MQ", "TMMQ@2026", True),
    ("TMMRDAMARAGIDDA", "DAMARAGIDDA", "School", "MR", "TMMR@2026", True),
    ("TMMSMAKTHAL", "MAKTHAL", "School", "MS", "TMMS@2026", True),
    ("TMMTKRISHNA", "KRISHNA", "School", "MT", "TMMT@2026", True),
    ("TMMUMAGANOOR", "MAGANOOR", "School", "MU", "TMMU@2026", True),
    ("TMMVNARWA", "NARWA", "School", "MV", "TMMV@2026", True),
    ("TMMWMARIKAL", "MARIKAL", "School", "MW", "TMMW@2026", True),
    ("TMMXHYD01", "HYD01", "School", "MX", "TMMX@2026", True),
    ("TMMYHYD02", "HYD02", "School", "MY", "TMMY@2026", True),
    ("TMUAHYTHABAD", "HYTHABAD", "School", "UA", "TMUA@2026", True),
    ("TMUBCHANDAVALLY", "CHANDAVALLY", "School", "UB", "TMUB@2026", True),
    ("TMUCINMULNARVA", "INMULNARVA", "School", "UC", "TMUC@2026", True),
    ("TMUDMEKUGUDA", "MEKUGUDA", "School", "UD", "TMUD@2026", True),
    ("TMIARAJAPOOR", "RAJAPOOR", "School", "IA", "TMIA@2026", True),
    ("TMIBGOLLAPALLY", "GOLLAPALLY", "School", "IB", "TMIB@2026", True),
    ("TMICGOKULAM", "GOKULAM", "School", "IC", "TMIC@2026", True),
]


class Command(BaseCommand):
    help = "Import login accounts from the T&M_PWA_Master Users sheet."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        with transaction.atomic():
            for username, name, role, code, pin, active in ROWS:
                role_value = ROLE_MAP[role]
                school = self._resolve_school(code, name) if role_value == User.SCHOOL else None
                is_admin_email = role_value != User.SCHOOL

                user, was_created = User.objects.update_or_create(
                    username=username,
                    defaults={
                        "email": username if is_admin_email else "",
                        "display_name": name,
                        "role": role_value,
                        "school": school,
                        "is_active": active,
                        "is_staff": role_value == User.ADMIN,
                        "is_superuser": role_value == User.ADMIN,
                    },
                )
                user.set_password(pin)
                user.save(update_fields=["password"])
                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(
            self.style.SUCCESS(f"Imported {len(ROWS)} accounts ({created} created, {updated} updated).")
        )

    @staticmethod
    def _resolve_school(code: str, name: str) -> School:
        school = School.objects.filter(school_code=code).first()
        if school:
            return school

        prefix = code[0]
        partner, _ = Partner.objects.get_or_create(name=f"Partner {prefix} (pending)")
        instance, _ = ProgramInstance.objects.get_or_create(
            code=f"{prefix}-2026",
            defaults={"partner": partner, "year": 2026, "label": f"Pending onboarding — group {prefix}"},
        )
        return School.objects.create(instance=instance, school_code=code, name=name)
