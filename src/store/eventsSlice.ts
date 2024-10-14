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
        state.value = action.payload;
    }
  },
})

// Action creators are generated for each case reducer function
export const { setEvents } = eventsSlice.actions

export default eventsSlice.reducer