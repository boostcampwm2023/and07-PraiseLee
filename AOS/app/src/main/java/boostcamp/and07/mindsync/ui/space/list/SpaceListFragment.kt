package boostcamp.and07.mindsync.ui.space.list

import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import boostcamp.and07.mindsync.R
import boostcamp.and07.mindsync.data.model.Space
import boostcamp.and07.mindsync.databinding.FragmentSpaceListBinding
import boostcamp.and07.mindsync.ui.base.BaseFragment
import boostcamp.and07.mindsync.ui.boardlist.SpaceListAdapter
import boostcamp.and07.mindsync.ui.main.SpaceClickListener
import dagger.hilt.android.AndroidEntryPoint

@AndroidEntryPoint
class SpaceListFragment : BaseFragment<FragmentSpaceListBinding>(R.layout.fragment_space_list) {
    private val spaceListViewModel: SpaceListViewModel by viewModels()
    private val spaceListAdapter = SpaceListAdapter()

    override fun initView() {
        setBinding()
        spaceListViewModel.getSpaces()
    }

    private fun setBinding() {
        binding.vm = spaceListViewModel
        binding.rvSpaceList.adapter = spaceListAdapter
        spaceListAdapter.setSpaceClickListener(
            object : SpaceClickListener {
                override fun onClickSpace(space: Space) {
                    findNavController().navigate(
                        SpaceListFragmentDirections.actionToBoardListFragment(
                            spaceId = space.id,
                        ),
                    )
                }
            },
        )
    }
}