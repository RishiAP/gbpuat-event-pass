import Verifier from '@/types/Verifier';
import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface VerifiersState {
  value: Verifier[],
}

const initialState: VerifiersState = {
  value: [],
}

export const verifiersSlice = createSlice({
  name: 'verifiers',
  initialState,
  reducers: {
    setVerifiers:(state,action:PayloadAction<Verifier[]>)=>{
        state.value = action.payload;
    }
  },
})

// Action creators are generated for each case reducer function
export const { setVerifiers } = verifiersSlice.actions

export default verifiersSlice.reducer