import Event from '@/types/Event';
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface EventsState {
  value: Event[],
}

const initialState: EventsState = {
  value: [],
}

export const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    setEvents:(state,action:PayloadAction<Event[]>)=>{
        state.value = Array.from(action.payload).sort((a:Event,b:Event)=>(new Date(b.date).getTime() - new Date(a.date).getTime()));
    },
    increaseEmailsSent:(state,action:PayloadAction<{_id:string,increase:number}>)=>{
        const index = state.value.findIndex(event=>event._id===action.payload._id);
        if(index!==-1){
            state.value[index].emails_sent+=action.payload.increase;
        }
    },
    increaseInvitationsGenerated:(state,action:PayloadAction<{_id:string,increase:number}>)=>{
        const index = state.value.findIndex(event=>event._id===action.payload._id);
        if(index!==-1){
            state.value[index].invitations_generated+=action.payload.increase;
        }
    },
    increaseIdCardsGenerated:(state,action:PayloadAction<{_id:string,increase:number}>)=>{
        const index = state.value.findIndex(event=>event._id===action.payload._id);
        if(index!==-1){
            state.value[index].id_card_generated+=action.payload.increase;
        }
    }
  },
})

// Action creators are generated for each case reducer function
export const { setEvents,increaseEmailsSent,increaseInvitationsGenerated,increaseIdCardsGenerated } = eventsSlice.actions

export default eventsSlice.reducer