import {PrismaClient,ProgramType,StaffRole,ContentType} from "@prisma/client";import bcrypt from "bcryptjs";
const prisma=new PrismaClient();
async function main(){const dept=await prisma.department.upsert({where:{code:"MCA"},update:{},create:{code:"MCA",name:"Master of Computer Applications"}});const regular=await prisma.program.upsert({where:{departmentId_type:{departmentId:dept.id,type:ProgramType.REGULAR}},update:{name:"MCA Regular"},create:{name:"MCA Regular",type:ProgramType.REGULAR,departmentId:dept.id}});const integrated=await prisma.program.upsert({where:{departmentId_type:{departmentId:dept.id,type:ProgramType.INTEGRATED}},update:{name:"MCA Integrated"},create:{name:"MCA Integrated",type:ProgramType.INTEGRATED,departmentId:dept.id}});const subjects=["Data Structures","Database Management Systems","Computer Networks","Operating Systems","Web Technology","Software Engineering"];for(const p of [regular,integrated]){const max=p.type===ProgramType.REGULAR?4:10;for(let n=1;n<=max;n++){const sem=await prisma.semester.upsert({where:{programId_number:{programId:p.id,number:n}},update:{},create:{programId:p.id,number:n}});if(n<=4)for(let i=0;i<Math.min(3,subjects.length);i++)await prisma.subject.upsert({where:{semesterId_code:{semesterId:sem.id,code:`MCA${n}${i+1}`}},update:{name:subjects[i]},create:{semesterId:sem.id,code:`MCA${n}${i+1}`,name:subjects[i]}})}}const passwordHash=await bcrypt.hash("Mca@12345",12);const admin=await prisma.staff.upsert({where:{email:"admin@mca.local"},update:{name:"MCA Administrator",role:StaffRole.ADMIN,programId:regular.id,passwordHash},create:{name:"MCA Administrator",email:"admin@mca.local",role:StaffRole.ADMIN,programId:regular.id,passwordHash}});const staff=await prisma.staff.upsert({where:{email:"staff@mca.local"},update:{name:"Demo Teacher",role:StaffRole.STAFF,programId:regular.id,passwordHash},create:{name:"Demo Teacher",email:"staff@mca.local",role:StaffRole.STAFF,programId:regular.id,passwordHash}});await prisma.staff.upsert({where:{email:"teacher2@mca.local"},update:{name:"Second Teacher",role:StaffRole.STAFF,programId:regular.id,passwordHash},create:{name:"Second Teacher",email:"teacher2@mca.local",role:StaffRole.STAFF,programId:regular.id,passwordHash}});const first=await prisma.subject.findFirst({where:{semester:{programId:regular.id,number:1}},orderBy:{code:"asc"}});
if(first){
const existingAssignment = await prisma.staffSubject.findFirst({
  where: {
    staffId: staff.id,
    subjectId: first.id,
    academicYear: "2026-27",
    isActive: true,
  },
});

if (!existingAssignment) {
  await prisma.staffSubject.create({
    data: {
      staffId: staff.id,
      subjectId: first.id,
      academicYear: "2026-27",
      assignedFrom: new Date(),
      assignedTo: null,
      isActive: true,
    },
  });
}const content=await prisma.content.findFirst({where:{subjectId:first.id,title:"Demo Study Material"}});if(!content)await prisma.content.create({data:{subjectId:first.id,title:"Demo Study Material",description:"Replace this demo resource with real department material.",type:ContentType.STUDY_MATERIAL,versions:{create:{versionNumber:1,fileName:"demo.txt",storageKey:"demo.txt",mimeType:"text/plain",sizeBytes:0,uploadedById:staff.id,changeNote:"Seed demo"}}}})}console.log("Seed complete",{admin:admin.email,staff:staff.email});}
main().catch(console.error).finally(()=>prisma.$disconnect());
