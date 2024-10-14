import { configureStore, current } from '@reduxjs/toolkit'
import eventsSlice from './eventsSlice'
import verifiersSlice from './verifiersSlice'

export const store = configureStore({
  reducer: {
    events:eventsSlice,
    verifiers:verifiersSlice
  },
})

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch