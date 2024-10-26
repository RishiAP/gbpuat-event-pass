import { Card } from 'flowbite-react';
import Image from 'next/image'; // Assuming you're using next/image for better image optimization
import User from '@/types/User'; // Adjust the path according to your project

interface UserCardProps {
  user: User;
  event:string,
}

const UserCard: React.FC<UserCardProps> = ({ user,event }) => {
  return (
    <Card className="max-w-sm bg-white shadow-lg hover:shadow-xl transition-shadow duration-300">
      <div className="flex flex-col">
        <div className="w-48 h-48 mb-4 flex justify-center w-full text-center">
          {user.photo ? (
            <Image
              src={user.photo}
              alt={`${user.name}'s profile photo`}
              width={192}
              height={192}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="bg-gray-300 rounded-full w-full h-full flex items-center justify-center">
              <span className="text-xl text-white">No Photo</span>
            </div>
          )}
        </div>
        <h3 className="text-xl font-semibold">{user.name}</h3>
        <p className="text-gray-500">{user.email}</p>
        <div className="mt-2">
          <span className="text-gray-600">Aadhar:</span> {user.aadhar}
        </div>
        <div className="mt-2">
          <span className="text-gray-600">College:</span> {user.college ?user.college.name: 'N/A'}
        </div>
        {user.designation && (
          <div className="mt-2">
            <span className="text-gray-600">Designation:</span> {user.designation}
          </div>
        )}
        {user.department && (
          <div className="mt-2">
            <span className="text-gray-600">Department:</span> {user.department.name}
          </div>
        )}
        {user.college_id && (
          <div className="mt-2">
            <span className="text-gray-600">College ID:</span> {user.college_id}
          </div>
        )}
        {
          user.events[event]?<>
            <div className="mt-2">
            <span className="text-gray-600">Seat No:</span> {user.events[event]?.seat_no}
          </div>
          <div className="mt-2">
            <span className="text-gray-600">Enclosure No:</span> {user.events[event]?.enclosure_no}
          </div>
          <div className="mt-2">
            <span className="text-gray-600">Verifier/Gate:</span> <span className={`${user.same_gate?"text-green-500":"text-red-600"}`}>{user.events[event]?.verifier.name}</span>
          </div>
          <div className="mt-2">
            <span className="text-gray-600">Status:</span> <span className={`${!user.events[event].status?"text-blue-600":user.repeated?"text-red-600":"text-green-500"}`}>{!user.events[event].status?<span>Not verified. Belongs to verifier/gate <strong>{user.events[event]?.verifier.name}</strong></span>:user.repeated?"Already Verified":"Verified"}</span>
          </div>
          </>:null
        }
      </div>
    </Card>
  );
};

export default UserCard;
