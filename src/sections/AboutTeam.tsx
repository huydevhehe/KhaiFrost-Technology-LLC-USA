"use client";

import Image from "next/image";
import { useTranslation } from "react-i18next";
import { SectionEyebrow } from "@/components/ui/SectionEyebrow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { useLocalizedField } from "@/lib/useLocalizedField";
import { aboutTeamMembers } from "@/content/aboutPageData";
import { AboutTeamMember } from "@/types";

function TeamMemberCard({ member }: { member: AboutTeamMember }) {
  const role = useLocalizedField(member.role);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm">
      <div className="relative aspect-square w-full">
        <Image
          src={member.image}
          alt={member.name}
          fill
          sizes="(min-width: 768px) 25vw, 50vw"
          className="object-cover"
        />
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-slate-900">{member.name}</h3>
        <p className="mt-0.5 text-sm text-slate-500">{role}</p>
      </div>
    </div>
  );
}

export function AboutTeam() {
  const { t } = useTranslation();

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionEyebrow>{t("aboutPage.team.eyebrow")}</SectionEyebrow>
            <SectionHeading>{t("aboutPage.team.heading")}</SectionHeading>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-500">
              {t("aboutPage.team.intro")}
            </p>
          </div>
          <a href="#" className="text-sm font-medium text-accent">
            {t("aboutPage.team.cta")}
          </a>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-4">
          {aboutTeamMembers.map((member) => (
            <TeamMemberCard key={member.id} member={member} />
          ))}
        </div>
      </div>
    </section>
  );
}
