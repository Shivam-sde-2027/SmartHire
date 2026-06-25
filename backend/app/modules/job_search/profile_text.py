from app.modules.resume_parser.schemas import Resume


def build_profile_text(resume: Resume) -> str:
    lines = [
        f"Name: {resume.name or ''}",
        f"Target Role: {resume.target_role or ''}",
        "",
        "Summary:",
        resume.summary or "",
        "",
        "Skills:",
        ", ".join(resume.skills),
        "",
        "Education:",
    ]

    for edu in resume.education:
        lines.extend(
            [
                f"Degree: {edu.degree or ''}",
                f"Institute: {edu.institute or ''}",
                f"Year: {edu.year or ''}",
                f"Score: {edu.score or ''}",
                "",
            ]
        )

    lines.append("Experience:")
    for exp in resume.experience:
        lines.extend(
            [
                f"Role: {exp.role or ''}",
                f"Company: {exp.company or ''}",
                f"Duration: {exp.duration or ''}",
                f"Highlights: {'; '.join(exp.highlights)}",
                "",
            ]
        )

    lines.append("Projects:")
    for proj in resume.projects:
        lines.extend(
            [
                f"Project: {proj.name or ''}",
                f"Technologies: {', '.join(proj.tech_stack)}",
                f"Description: {proj.description or ''}",
                "",
            ]
        )

    if resume.total_experience_years is not None:
        lines.append(f"Total Experience Years: {resume.total_experience_years}")

    return "\n".join(lines).strip()
