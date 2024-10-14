
"use client";

import { Button, Modal } from "flowbite-react";
import { useState } from "react";

export function CreateEventModal() {
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <Button className='mt-4' size='xl' color='purple' onClick={() => setOpenModal(true)}>Create Event</Button>
      <Modal dismissible show={openModal} onClose={() => setOpenModal(false)}>
        <Modal.Header>Create a new event</Modal.Header>
        <Modal.Body>
          <div className="space-y-6">
            
          </div>
        </Modal.Body>
        <Modal.Footer className="justify-end">
          <Button color="gray" onClick={() => setOpenModal(false)}>
            Cancel
          </Button>
          <Button onClick={() => setOpenModal(false)}>I accept</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
