#!/usr/bin/env python3
"""
Merge members.xlsx and members-accounts.xlsx into a single JSON file
ready for Firebase import.

Usage:
    python3 scripts/prepare-member-import.py

Output:
    tmp/members-import.json
"""

import json
import pandas as pd
from datetime import datetime

# Emails to exclude (test accounts)
EXCLUDED_EMAILS = {"prueba@secid.mx", "prueba_2@secid.mx"}

def parse_skills(raw):
    if pd.isna(raw):
        return []
    return [s.strip() for s in str(raw).replace(";", ",").split(",") if s.strip()]

def normalize_academic_level(raw):
    if pd.isna(raw):
        return None
    val = str(raw).lower().strip()
    if "licenciatura" in val:
        return "licenciatura"
    if "posgrado" in val or "maestr" in val or "doctor" in val:
        return "posgrado"
    if "curso" in val or "actualización" in val:
        return "curso"
    return None

def safe_str(val):
    if pd.isna(val):
        return None
    return str(val).strip() or None

def normalize_generation(raw):
    if pd.isna(raw):
        return None
    try:
        return str(int(float(raw)))
    except (ValueError, TypeError):
        return str(raw).strip()

def to_iso(val):
    if pd.isna(val):
        return None
    if isinstance(val, datetime):
        return val.isoformat()
    try:
        return pd.Timestamp(val).isoformat()
    except Exception:
        return None

def main():
    df_members = pd.read_excel("tmp/members.xlsx")
    df_accounts = pd.read_excel("tmp/members-accounts.xlsx")

    df_members["email_norm"] = df_members["Dirección de correo electrónico"].str.strip().str.lower()
    df_accounts["email_norm"] = df_accounts["Dirección de correo electrónico"].str.strip().str.lower()

    df_members = df_members[~df_members["email_norm"].isin(EXCLUDED_EMAILS)]

    account_map = {}
    for _, row in df_accounts.iterrows():
        email = row["email_norm"]
        nc = row.get("Numero de cuenta")
        if pd.notna(nc):
            account_map[email] = str(int(nc))

    records = []
    for _, row in df_members.iterrows():
        email = row["Dirección de correo electrónico"].strip()
        email_lower = email.lower()

        first_name = safe_str(row["Nombre(s)"])
        last_paterno = safe_str(row["Apellido Paterno"])
        last_materno = safe_str(row["Apellido Materno"])
        last_name = " ".join(filter(None, [last_paterno, last_materno]))
        display_name = " ".join(filter(None, [first_name, last_paterno]))

        is_member = pd.notna(row.get("Miembro"))
        tipo = safe_str(row.get("Tipo de registro")) or ""

        if is_member or "miembro" in tipo.lower() or "egresado" in tipo.lower():
            role = "member"
            lifecycle_status = "active"
            registration_type = "member"
            verification_status = "approved"
        else:
            role = "collaborator"
            lifecycle_status = "collaborator"
            registration_type = "collaborator"
            verification_status = "none"

        record = {
            "email": email,
            "displayName": display_name or email.split("@")[0],
            "firstName": first_name,
            "lastName": last_name,
            "role": role,
            "registrationType": registration_type,
            "verificationStatus": verification_status,
            "lifecycleStatus": lifecycle_status,
            "numeroCuenta": account_map.get(email_lower),
            "academicLevel": normalize_academic_level(
                row.get("Indica el nivel académico en el que cursaste estudios de ciencia de datos en la UNAM.")
            ),
            "campus": safe_str(row.get("Indica tu sede de estudios")),
            "generation": normalize_generation(row.get("Elige la generación a la que perteneces.")),
            "gender": safe_str(row.get("Indica el género con el que te identificas.")),
            "company": safe_str(row.get("Última empresa o institución en la que laboras / laboraste")),
            "position": safe_str(row.get("Puesto de trabajo")),
            "professionalStatus": safe_str(row.get("Situación profesional")),
            "maxDegree": safe_str(row.get("Máximo grado de estudios")),
            "maxDegreeInstitution": safe_str(
                row.get("Institución en la que cursaste el máximo grado de estudios")
            ),
            "maxDegreeProgram": safe_str(
                row.get("Nombre del programa del máximo grado de estudios")
            ),
            "skills": parse_skills(row.get("Intereses / área de expertise")),
            "experienceLevel": safe_str(
                row.get("Indica el nivel de experiencia que tienes en el área de ciencia de datos")
            ),
            "currentlyStudying": safe_str(row.get("¿Estudias actualmente?")),
            "linkedin": safe_str(row.get("LinkedIn")),
            "instagram": safe_str(row.get("Instagram")),
            "twitter": safe_str(row.get("Twitter")),
            "facebook": safe_str(row.get("Facebook")),
            "phone": safe_str(row.get("Teléfono")),
            "cvUrl": safe_str(row.get("Currículum vitae")),
            "cvHighlights": safe_str(row.get("Resumé (CV highlights)")),
            "birthDate": to_iso(row.get("Fecha de Nacimiento")),
            "registeredAt": to_iso(row.get("Marca temporal")),
            "whatsappConsent": safe_str(
                row.get("¿Autorizas que añadamos tu número de teléfono a la comunidad de WhatsApp de egresados de la SECiD?")
            ),
            "objectives": safe_str(
                row.get("¿Cuáles son los principales objetivos de tu acercamiento a SECiD?")
            ),
            "expectations": safe_str(
                row.get("Describe a mayor detalle cuáles son tus expectativas al colaborar con SECiD.")
            ),
            "priorities": {
                "bolsaTrabajo": safe_str(row.get("Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Bolsa Trabajo]")),
                "hackatones": safe_str(row.get("Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Hackatones]")),
                "cursosEspecializados": safe_str(row.get("Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Cursos especializados]")),
                "seminarios": safe_str(row.get("Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Seminarios]")),
                "asesorias": safe_str(row.get("Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Asesorías]")),
                "mentoria": safe_str(row.get("Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Mentoría]")),
                "newsletter": safe_str(row.get("Selecciona el nivel de prioridad que le asignas a cada una de las siguientes iniciativas: [Newsletter]")),
            },
            "comments": safe_str(
                row.get("Comparte tus recomendaciones adicionales, comentarios, y sugerencias sobre cómo podríamos colaborar y mejorar.")
            ),
        }

        record["priorities"] = {k: v for k, v in record["priorities"].items() if v is not None}
        records.append(record)

    output = {
        "generatedAt": datetime.now().isoformat(),
        "totalMembers": len(records),
        "memberCount": sum(1 for r in records if r["role"] == "member"),
        "collaboratorCount": sum(1 for r in records if r["role"] == "collaborator"),
        "excludedEmails": list(EXCLUDED_EMAILS),
        "members": records,
    }

    with open("tmp/members-import.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"Wrote {len(records)} records to tmp/members-import.json")
    print(f"  Members: {output['memberCount']}")
    print(f"  Collaborators: {output['collaboratorCount']}")
    print(f"  With account numbers: {sum(1 for r in records if r['numeroCuenta'])}")
    print(f"  Excluded: {EXCLUDED_EMAILS}")

if __name__ == "__main__":
    main()
