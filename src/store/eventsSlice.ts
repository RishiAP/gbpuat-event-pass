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
    }
  },
})

// Action creators are generated for each case reducer function
export const { setEvents } = eventsSlice.actions

export default eventsSlice.reducer