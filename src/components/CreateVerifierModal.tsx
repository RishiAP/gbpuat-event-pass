"use client";

import Verifier from "@/types/Verifier";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setVerifiers } from "@/store/verifiersSlice";
import { Eye, EyeOff, Loader2 } from "lucide-react";

interface VerifierModalProps {
  verifier?: Verifier;
  isOpen: boolean;
  onClose: () => void;
  onVerifierUpdated: (verifier: Verifier) => void;
}

export function VerifierModal({ verifier, isOpen, onClose, onVerifierUpdated }: VerifierModalProps) {
  const dispatch = useDispatch();
  const verifiers = useSelector((state: any) => state.verifiers.value);
  
  const initialVerifier = {
    username: verifier?.username || "",
    name: verifier?.name || "",
    password: "",
  };

  useEffect(() => {
    if (verifier) {
      setFormData({ name: verifier.name, username: verifier.username, password: "" });
    } else {
      setFormData(initialVerifier);
    }
  }, [verifier, isOpen]);

  const [formData, setFormData] = useState<Partial<Verifier>>(initialVerifier);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    axios({
      method: verifier ? "PUT" : "POST",
      url: "/api/admin",
      data: verifier 
        ? { ...formData, type: "verifier", _id: verifier._id } 
        : { ...formData, type: "verifier" },
    })
      .then((res) => {
        onClose();
        if (verifier) {
          onVerifierUpdated({ ...verifier, ...formData });
        } else {
          dispatch(setVerifiers([
            ...verifiers, 
            { name: formData.name, username: formData.username, _id: res.data._id }
          ]));
        }
        setFormData(initialVerifier);
        toast.success(`Verifier ${verifier ? "updated" : "added"} successfully`);
      })
      .catch((err) => {
        const action = verifier ? "update" : "add";
        toast.error(`Failed to ${action} verifier: ${err.response?.data?.message || "Unknown error"}`);
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  function handleClose() {
    if (!loading) {
      onClose();
    }
  }

  return (
    <Dialog open={loading || isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{verifier ? "Edit Verifier" : "Add Verifier"}</DialogTitle>
          <DialogDescription>
            {verifier 
              ? "Update the verifier details below." 
              : "Create a new verifier by filling in the details below."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleFormSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="Enter verifier name"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="Enter username"
                value={formData.username || ""}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                Password {verifier && <span className="text-xs text-muted-foreground">(leave empty to keep current)</span>}
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={verifier ? "Enter new password (optional)" : "Enter password"}
                  value={formData.password || ""}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!verifier}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-3 flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? (verifier ? "Updating..." : "Adding...") : verifier ? "Update Verifier" : "Add Verifier"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}