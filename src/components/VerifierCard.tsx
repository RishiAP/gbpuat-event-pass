import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, UserCheck, Key, Eye, EyeOff, Loader2 } from 'lucide-react';
import Verifier from "@/types/Verifier";
import axios from "axios";
import { useState } from "react";

interface VerifierCardProps {
  verifier: Verifier;
  onEdit: (id: string) => void;
}

export function VerifierCard({ verifier, onEdit }: VerifierCardProps) {
  const [loadingPass, setLoadingPass] = useState(false);
  const [passDisplay, setPassDisplay] = useState(false);
  const initialPass = "••••••••••";
  const [pass, setPass] = useState(initialPass);
  
  function getPass() {
    setLoadingPass(true);
    axios.get(`/api/admin?query=verifier_pass&_id=${verifier._id}`)
      .then((res) => {
        setPassDisplay(true);
        setPass(res.data.password);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoadingPass(false));
  }

  function hidePass() {
    setPassDisplay(false);
    setPass(initialPass);
  }

  return (
    <Card className="max-w-sm min-w-72 mt-4 shadow-lg hover:shadow-2xl transition-shadow">
      <CardContent className="pt-6">
        <div className="flex justify-between items-center mb-4">
          <h5 className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center break-words">
            <UserCheck className="mr-2 text-blue-600 flex-shrink-0" size={20} />
            <span className="break-all">{verifier.name}</span>
          </h5>
          <div className="flex gap-2 ml-2 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(verifier._id)}
              className="h-8 w-8"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="flex gap-2 items-center">
            <UserCheck className="text-green-500 flex-shrink-0" size={18} />
            <span className="text-gray-700 dark:text-gray-300">{verifier.username}</span>
          </p>

          <div className="flex items-center gap-2">
            <Key className="text-yellow-500 flex-shrink-0" size={18} />
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-sm font-mono flex-1 truncate">{pass}</span>
              <div className="flex-shrink-0">
                {loadingPass ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                ) : passDisplay ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={hidePass}
                  >
                    <EyeOff className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={getPass}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}