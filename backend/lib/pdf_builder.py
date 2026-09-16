"""
Renders the bilingual (English/Telugu) InquiBuddy feedback report as a PDF,
matching the layout in docs/InquiBuddy_School_Panel_User_Flow_Manual.pdf
(screen 8: team details + idea photo, then a 5-question EN/TE table).

Uses WeasyPrint (HTML -> PDF) because it shapes text through Pango/HarfBuzz,
which is what correct Telugu rendering (conjuncts, matras) actually needs --
libraries that draw glyphs without real OpenType shaping (reportlab, etc.)
render Telugu incorrectly. On Windows, WeasyPrint needs the GTK3 runtime
installed separately (see https://doc.courtbouillon.org/weasyprint/stable/first_steps.html#windows)
or just run the backend inside Docker/WSL, where Linux installs it as a
normal apt package. The import below is deliberately lazy so the rest of the
Django app still boots on a Windows dev machine without GTK3 installed --
only actually generating a PDF requires it.

On Linux (staging/prod), also install the "Noto Sans Telugu" font package (or
bundle the .ttf under static/fonts/ and add an @font-face rule in
_report_style.html) so Telugu text doesn't fall back to tofu boxes.
"""

from io import BytesIO

from django.template.loader import render_to_string


def render_team_feedback_pdf(*, school_name: str, partner_name: str, grade: int, section: str,
                              team_code: str, sl_name: str, student_names: list[str],
                              idea_photo_url: str | None, questions: list[dict],
                              generated_at) -> bytes:
    html = render_to_string(
        "inquibuddy/feedback_report.html",
        {
            "report": {
                "school_name": school_name,
                "partner_name": partner_name,
                "grade": grade,
                "section": section,
                "team_code": team_code,
                "sl_name": sl_name,
                "student_names": ", ".join(student_names),
                "idea_photo_url": idea_photo_url,
                "questions": questions,
                "generated_at": generated_at,
            }
        },
    )
    return _html_to_pdf(html)


def render_all_teams_feedback_pdf(team_reports: list[dict]) -> bytes:
    """``team_reports`` is a list of the same context dicts used per-team above;
    renders one page per team in a single combined PDF."""
    html = render_to_string("inquibuddy/feedback_report_all_teams.html", {"team_reports": team_reports})
    return _html_to_pdf(html)


def _html_to_pdf(html: str) -> bytes:
    from weasyprint import HTML

    buf = BytesIO()
    HTML(string=html).write_pdf(buf)
    return buf.getvalue()
