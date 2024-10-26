"use client";

import Verifier from "@/types/Verifier";
import { Button, FloatingLabel, Modal } from "flowbite-react";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { useDispatch, useSelector } from "react-redux";
import { setVerifiers } from "@/store/verifiersSlice";
import { FaEye, FaEyeSlash } from "react-icons/fa";

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
    if (verifier) setFormData({ name: verifier.name, username: verifier.username });
  },[verifier]);

  const [formData, setFormData] = useState<Partial<Verifier>>(initialVerifier);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State to toggle password visibility

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    axios({
      method: verifier ? "PUT" : "POST",
      url: "/api/admin",
      data: verifier?{ ...formData, type: "verifier", _id: verifier._id }:{ ...formData, type: "verifier" },
    }).then((res) => {
      onClose();
      if(verifier)
        onVerifierUpdated({ ...verifier, ...formData });
      else
        dispatch(setVerifiers([...verifiers, { name: formData.name, username: formData.username, _id: res.data._id }]));
      setFormData(initialVerifier);
      toast.success(`Verifier ${verifier ? "updated" : "added"} successfully`, { theme: document.querySelector("html")?.classList.contains("dark") ? "dark" : "light" });
    }).catch((err) => {
      if(verifier)
        toast.error(`Failed to update verifier: ${err.response.data.message}`);
      else
        toast.error(`Failed to add verifier: ${err.response.data.message}`);
      console.error(err);
    }).finally(() => setLoading(false));
  };

  return (
    <Modal show={loading || isOpen} onClose={onClose} dismissible>
      <Modal.Header>{verifier ? "Edit Verifier" : "Add Verifier"}</Modal.Header>
      <form onSubmit={handleFormSubmit}>
        <Modal.Body>
          <div className="space-y-6">
            <FloatingLabel
              variant="standard"
              label="Name"
              value={formData.name || ""}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <FloatingLabel
              variant="standard"
              label="Username"
              value={formData.username || ""}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
            <div className="relative">
              <FloatingLabel
                variant="standard"
                label="Password"
                type={showPassword ? "text" : "password"} // Change type based on state
                value={formData.password || ""}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required={!verifier}
              />
              <span
                className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-500 text-xl"
                onClick={() => setShowPassword(!showPassword)} // Toggle password visibility
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </span>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-end">
          <Button color="gray" onClick={onClose}>Cancel</Button>
          <Button type="submit" isProcessing={loading}>
            {loading ? "Adding..." : verifier ? "Update Verifier" : "Add Verifier"}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  );
}
