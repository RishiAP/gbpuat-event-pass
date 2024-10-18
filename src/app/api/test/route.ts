import { connect } from "@/config/database/mongoDBConfig";
import { College } from "@/models/College";
import { Department } from "@/models/Department";
import { NextRequest, NextResponse } from "next/server";
connect();
export async function GET(req:NextRequest){
    const colleges:any[]=[
        ["College of Agribusiness Management",1996,["Agribusiness and Rural Management","Business Administration","Operations and Information System"]],
        ["College of Agriculture",1960,["Department of Agricultural Communication","Department of Agricultural Economics","Department of Agrometeorology","Department of Agronomy","Department of Entomology","Department of Food Science and Technology","Department of Genetics and Plant Breeding","Department of Horticulture","Department of Plant Pathology","Department of Soil Science","Department of Vegetable Science"]],
        ["College of Basic Sciences and Humanities",1963,["Department of Biochemistry","Department of Biological Sciences","Department of Chemistry","Department of Environmental Science","Department of Humanities and Social Sciences","Department of Mathematics, Statistics and Computer Science","Department of Microbiology","Department of Molecular Biology and Genetic Engineering","Department of Physics","Department of Plant Physiology","Radio and Isotopes Laboratory","Bioinformatics Center"]],
        ["College of Fisheries",1985,["Department of Aquaculture","Department of Fisheries Resource Management","Department of Aquatic Environment Management","Department of Fish Harvest and Processing Technology","Department of Fisheries Extension Education"]],
        ["College of Community Science",1971,["Department of Textile and Apparel Designing","Department of Resource Management and Consumer Science","Department of Human Development and Family Studies","Department of Food Science and Nutrition","Department of Extension Education and Communication Management"]],
        ["College of Technology",1962,["Department of Agricultural Engineering","Department of Civil Engineering","Department of Computer Engineering","Department of Electrical Engineering","Department of Electronics and Communication Engineering","Department of Industrial and Production Engineering","Department of Information Technology","Department of Mechanical Engineering"]],
        ["College of Veterinary and Animal Sciences",1960,["Department of Animal Nutrition","Department of Animal Genetics and Breeding","Department of Livestock Production Management","Department of Veterinary Anatomy","Department of Veterinary Microbiology","Department of Veterinary Parasitology","Department of Veterinary Pathology","Department of Veterinary Pharmacology and Toxicology","Department of Veterinary Physiology and Biochemistry","Department of Veterinary Public Health and Epidemiology","Department of Veterinary Surgery and Radiology","Department of Veterinary Gynaecology and Obstetrics","Department of Veterinary Medicine","Department of Veterinary and Animal Husbandry Extension Education","Department of Livestock Products Technology"]],
        ["College of Post Graduate Studies",1963,[]]
    ]
    let res:any,response=[],dep;
    for(let i=0;i<colleges.length;i++){
        res=new College(
            {
                name:colleges[i][0],
                location:"Pantnagar, Udham Singh Nagar",
                established:colleges[i][1]
            }
        );
        response.push(await res.save());
        colleges[i][2].forEach(async (ele:any) => {
            dep=new Department({name:ele,location:`${colleges[i][0]}, Pantnagar, Udham Singh Nagar`,college:res});
            await dep.save();
        });
    }
    return NextResponse.json(response,{status:200});
}