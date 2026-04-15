import "dotenv/config";
import { prisma } from "../lib/prisma";

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  const [vfs, afs, ass] = await Promise.all([
    prisma.videoFormat.findMany({ where: { isActive: true }, select: { id: true } }),
    prisma.adFormat.findMany({ where: { isActive: true }, select: { id: true } }),
    prisma.adSubject.findMany({ where: { isActive: true }, select: { id: true } }),
  ]);

  if (!vfs.length || !afs.length || !ass.length) {
    throw new Error("Reference tables empty — run prisma/seed.ts first");
  }

  const ads = await prisma.ad.findMany({
    where: {
      OR: [
        { videoFormatId: null },
        { adFormatId: null },
        { adSubjectId: null },
      ],
    },
    select: { id: true, videoFormatId: true, adFormatId: true, adSubjectId: true },
  });

  let updated = 0;
  for (const ad of ads) {
    await prisma.ad.update({
      where: { id: ad.id },
      data: {
        videoFormatId: ad.videoFormatId ?? pick(vfs).id,
        adFormatId: ad.adFormatId ?? pick(afs).id,
        adSubjectId: ad.adSubjectId ?? pick(ass).id,
      },
    });
    updated++;
  }

  console.log(`Updated ${updated} ads with random video/ad format and subject.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
