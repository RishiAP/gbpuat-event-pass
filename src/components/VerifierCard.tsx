import { Card, Button, Spinner } from "flowbite-react";
import { FiEdit, FiUserCheck } from 'react-icons/fi';
import { FaKey, FaUserCheck } from 'react-icons/fa';
import Verifier from "@/types/Verifier";
import { FaCircleUser, FaEye, FaEyeSlash } from "react-icons/fa6";
import axios from "axios";
import { useState } from "react";

interface VerifierCardProps {
  verifier: Verifier;
  onEdit: (id: string) => void;
}

export function VerifierCard({ verifier, onEdit }: VerifierCardProps) {
  const [loadingPass, setLoadingPass] = useState(false);
  const [passDisplay, setPassDisplay] = useState(false);
  const initialPass ="••••••••••";
  const [pass, setPass] = useState(initialPass);
  function getPass() {
    setLoadingPass(true);
    axios.get(`/api/admin?query=verifier_pass&_id=${verifier._id}`).then((res) => {
      setPassDisplay(true);
      setPass(res.data.password);
    }).catch((err) => {
      console.error(err);
    }).finally(() => setLoadingPass(false));
  }
  return (
    <Card className="max-w-sm min-w-72 mt-4 shadow-lg hover:shadow-2xl transition-shadow">
      <div className="flex justify-between items-center">
        <h5 className="text-lg font-bold tracking-tight text-gray-900 flex items-center">
          <FiUserCheck className="mr-2 text-blue-600" style={{whiteSpace:"break-spaces",wordBreak:"break-word"}} /> {verifier.name}
        </h5>
        <Button size="sm" color="yellow" onClick={() => onEdit(verifier._id)} className="p-2">
          <FiEdit className="text-lg" />
        </Button>
      </div>
      <div className="mb-2">
        <p className="font-normal flex gap-2 text-green-500 items-center mb-1"><span className="mr-1"><FaUserCheck/></span> <span className="text-gray-700 mt-1">{verifier.username}</span></p>
        <div className="flex items-center gap-1">
          <FaKey className="mr-2 text-yellow-500" /> 
          <span className="flex gap-2 items-center text-sm w-48">
            <span>{pass}</span>
            <span className="ml-auto">
            {
              loadingPass?<Spinner aria-label="Small spinner example" size="sm" />:
              passDisplay? <FaEyeSlash className="text-lg cursor-pointer" onClick={()=>{setPassDisplay(false); setPass(initialPass)}} />:
              <FaEye className="text-lg cursor-pointer" onClick={getPass} />
            }
            </span>
          </span>
        </div>
      </div>
    </Card>
  );
}
