
"use client";

import axios from "axios";
import { Avatar, Dropdown, Navbar } from "flowbite-react";
import NEXTImage from "next/image";
import { useRouter } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/ReactToastify.min.css';

const AppBar=()=> {
  const router=useRouter();
  function handleLogout(){
    const id=toast.loading('Logging out...');
    axios.get('/api/logout').then(res=>{
      console.log(res.data);
      window.location.pathname=window.location.pathname=="/admin"?'/admin-login':'/verifier-login';
      toast.update(id,{render:'Logged out successfully',type:'success',autoClose:3000,theme:document.querySelector('html')?.classList.contains('dark-mode')?'dark':'light',isLoading:false});
    }).catch(err=>{
      console.error(err);
      toast.update(id,{render:'Failed to logout',type:'error',autoClose:2000,theme:document.querySelector('html')?.classList.contains('dark-mode')?'dark':'light',isLoading:false});
    });
  }
  return (
    <>
    <Navbar fluid rounded>
      <Navbar.Brand href="#">
        <NEXTImage width={100} height={100} src="https://res.cloudinary.com/dnxfq38fr/image/upload/v1729400669/gbpuat-event-pass/viukl6evcdn1aj7rgqbb.png" alt="GBPUAT Logo" className="mr-3 h-12 sm:h-40" style={{height:"100%", width:"auto"}} />
        <span className="self-center whitespace-nowrap text-xl font-semibold dark:text-white">GBPUAT Events</span>
      </Navbar.Brand>
      <div className="flex md:order-2">
        <Dropdown
          arrowIcon={false}
          inline
          label={
            <Avatar alt="User settings" img="https://flowbite.com/docs/images/people/profile-picture-5.jpg" rounded />
          }
        >
          <Dropdown.Header>
            <span className="block text-sm">Bonnie Green</span>
            <span className="block truncate text-sm font-medium">name@flowbite.com</span>
          </Dropdown.Header>
          <Dropdown.Item>Dashboard</Dropdown.Item>
          <Dropdown.Item>Settings</Dropdown.Item>
          <Dropdown.Item>Earnings</Dropdown.Item>
          <Dropdown.Divider />
          <Dropdown.Item onClick={handleLogout}>Sign out</Dropdown.Item>
        </Dropdown>
        <Navbar.Toggle />
      </div>
      <Navbar.Collapse>
        <Navbar.Link href="#" active>
          Home
        </Navbar.Link>
        <Navbar.Link href="#">About</Navbar.Link>
        <Navbar.Link href="#">Services</Navbar.Link>
        <Navbar.Link href="#">Pricing</Navbar.Link>
        <Navbar.Link href="#">Contact</Navbar.Link>
      </Navbar.Collapse>
    </Navbar>
    <ToastContainer draggable draggablePercent={60} position='top-center' />
    </>
  );
}

export default AppBar;